/**
 * Encar.com → Supabase scraper.
 *
 * Pulls car listings from the public encar.com search API, normalizes them
 * to the flat shape used by the Next.js app (see src/lib/cars.ts and
 * supabase/migrations/0001_create_cars.sql), then upserts them into the
 * `cars` table. Listings that disappear from Encar are removed.
 *
 * One row per listing. All photos are stored inline as `images: text[]`.
 *
 * Required environment variables:
 *   SUPABASE_URL           - project URL
 *   SUPABASE_KEY           - service-role key (writes bypass RLS)
 *
 * Optional:
 *   SCRAPER_TARGETS                  - comma-separated aliases (overrides carlist.txt)
 *   SCRAPER_PAGE_SIZE                - default 500
 *   SCRAPER_TIMEOUT_MS               - default 15000
 *   SCRAPER_MAX_RETRIES              - default 3
 *   SCRAPER_PRICE_MARKUP_EUR         - default 400
 *   SCRAPER_MAX_LISTINGS_PER_MAKE    - cap per make (rolling top-N: any
 *                                      DB row outside the freshly fetched
 *                                      batch is treated as sold and removed)
 *
 * CLI:
 *   node scraper/scraper.js                    # use carlist.txt
 *   node scraper/scraper.js bmw porsche        # specific aliases
 */

const axios = require('axios');
const https = require('https');
const fs = require('fs/promises');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const {
  translate,
  translateRegion,
  reportUnmappedFragments,
} = require('./translations');
require('dotenv').config();

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const CARLIST_PATH = path.join(__dirname, 'carlist.txt');
const ENCAR_SEARCH_URL = 'https://api.encar.com/search/car/list/general';
const ENCAR_DETAIL_URL = 'https://api.encar.com/v1/readside/vehicle';

// How many detail requests to keep in flight at once. With cookie session
// + browser headers + HTTP keep-alive, 5 sustains ~10 RPS without
// tipping Encar's WAF — empirically: 8 still trips it on the next list
// page after a burst, 5 stays comfortably under. Tune via env var.
const DETAIL_CONCURRENCY =
  parsePositiveInt(process.env.SCRAPER_DETAIL_CONCURRENCY) || 5;
const EXCHANGE_RATE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/krw.json';
const ENCAR_IMAGE_HOST = 'https://ci.encar.com';

// 30 s lets us absorb residential / static proxy latency without
// false-positive timeouts. Tune via SCRAPER_TIMEOUT_MS for direct mode.
const REQUEST_TIMEOUT_MS = parsePositiveInt(process.env.SCRAPER_TIMEOUT_MS) || 30000;
const PAGE_SIZE = parsePositiveInt(process.env.SCRAPER_PAGE_SIZE) || 500;
// Five retries with exponential backoff lets us absorb the occasional
// Encar timeout / 502 mid-pagination instead of bailing on the bucket.
const MAX_RETRIES = parsePositiveInt(process.env.SCRAPER_MAX_RETRIES) || 5;
const PRICE_MARKUP_EUR = parsePositiveInt(process.env.SCRAPER_PRICE_MARKUP_EUR) || 400;

// Hard cap on how many listings to fetch per make. Prevents runaway syncs
// (e.g. Kia/Hyundai with 30k+ listings). The env var overrides this default.
// Set to 0 or Infinity in code (or omit the env var) for unlimited — but
// the default 500 protects against accidental full-catalogue scrapes.
const MAX_LISTINGS_PER_MAKE =
  parsePositiveInt(process.env.SCRAPER_MAX_LISTINGS_PER_MAKE) || 500;

// Tiered markup applied on top of the base markup based on the converted
// EUR price (pre-markup). Mirrors a typical importer fee structure where
// higher-value cars carry a slightly higher handling fee. Tiers are
// inclusive of the lower bound, exclusive of the upper bound.
//   < €10,000           -> PRICE_MARKUP_EUR (default 400)
//   €10,000 – €15,000   -> €500
//   €15,000 – €20,000   -> €600
//   €20,000+            -> €700
const PRICE_MARKUP_TIERS = [
  { min: 20000, markup: 700 },
  { min: 15000, markup: 600 },
  { min: 10000, markup: 500 },
];

function getMarkupForBaseEur(baseEur) {
  for (const tier of PRICE_MARKUP_TIERS) {
    if (baseEur >= tier.min) return tier.markup;
  }
  return PRICE_MARKUP_EUR;
}

// Static fallback used only if the live FX feed is unreachable. Update
// this whenever the live rate has drifted noticeably; a stale fallback
// silently overprices every car when the CDN fails.
//   2024-Q4 average:  ~0.00067
//   2025 average:     ~0.00062
//   2026 (today):     ~0.00058
const FALLBACK_KRW_TO_EUR_RATE = 0.00058;

// Sanity bounds for the live rate. KRW/EUR has stayed inside this band
// for the last decade; anything outside is almost certainly a bad
// upstream payload (decimal mistake, currency confusion, broken CDN).
// We refuse such rates and use the fallback instead.
const FX_RATE_MIN = 0.0004;   // ~1 EUR = 2,500 KRW (extreme weak KRW)
const FX_RATE_MAX = 0.0010;   // ~1 EUR = 1,000 KRW (extreme strong KRW)
const UPSERT_CHUNK_SIZE = 250;
const DELETE_CHUNK_SIZE = 250;
const SELECT_PAGE_SIZE = 1000;

// Encar's API stops paginating reliably after ~10k unique results per query,
// so when a make exceeds this we slice the query into year buckets.
// 9000 leaves a comfortable margin under the cap.
const SLICING_THRESHOLD = 9000;

// Kosovo customs rule: cars older than 10 years cannot be imported. Kept
// as currentYear - 11 so the cutoff auto-shifts each new year (e.g. in
// 2026 the floor is 2015, in 2027 it becomes 2016). Override at runtime
// with SCRAPER_MIN_YEAR if business rules change.
const MIN_REGISTRATION_YEAR =
  parsePositiveInt(process.env.SCRAPER_MIN_YEAR) || new Date().getFullYear() - 11;
const NEWEST_YEAR_BUCKET = new Date().getFullYear() + 1;
const OLDEST_YEAR_BUCKET = MIN_REGISTRATION_YEAR;

// yyyymm endpoints used wherever we need the absolute query window.
const MIN_YEAR_MM = MIN_REGISTRATION_YEAR * 100 + 1;
const MAX_YEAR_MM = NEWEST_YEAR_BUCKET * 100 + 12;

// Per-make minimum reasonable retail price (EUR). Listings whose computed
// price falls below the floor are treated as "price unknown" instead of
// shipping a wildly wrong number. Lets the UI fall back to "Kontakto për
// çmimin" rather than e.g. a €1,500 Ferrari.
//
// Floors are deliberately conservative — better to nullify a real cheap
// listing than ship a bogus one. Korean OEMs use a low floor because
// genuinely old, high-mileage Korean sedans sell for €500-1000.
const PRICE_FLOOR_EUR_DEFAULT = 700;

// Skip-if-fresh window: rows in our DB whose `updated_at` is younger
// than this threshold are considered "still valid" and we skip the
// detail-endpoint round-trip for them. The list endpoint still
// confirms the listing exists (so the deletion safeguard works
// correctly); we just don't re-download photos/specs we already have.
//
// Default 6h aligns with the 6-hour cron schedule — back-to-back
// runs (e.g. a manual run after a crash) become almost free, while
// a fresh nightly run sees everything as stale and re-enriches.
// Set SCRAPER_SKIP_FRESH_HOURS=0 to disable.
const SKIP_FRESH_HOURS = (() => {
  const raw = process.env.SCRAPER_SKIP_FRESH_HOURS;
  if (raw === '0') return 0;
  const parsed = parsePositiveInt(raw);
  return parsed ?? 6;
})();
const PRICE_FLOOR_EUR_BY_MAKE = {
  // Premium / sports / luxury — anything below these is clearly wrong.
  'Ferrari': 50000,
  'Aston Martin': 25000,
  'Porsche': 8000,
  'Maybach': 25000,
  'Rolls-Royce': 50000,
  'Lamborghini': 50000,
  'Bentley': 25000,
  // Premium sedans — we want to be a bit conservative.
  'Mercedes-Benz': 2000,
  'BMW': 2000,
  'Audi': 2000,
  'Lexus': 2500,
  'Jaguar': 2500,
  'Land Rover': 3000,
  'Tesla': 8000,
  // Mainstream Japanese / European
  'Volvo': 1500,
  'Toyota': 1200,
  'Honda': 1200,
  'Nissan': 1000,
  'Mazda': 1000,
  'Ford': 1200,
  'Fiat': 1000,
  'Peugeot': 1000,
  'Volkswagen': 1500,
  'Smart': 1000,
  // Korean OEMs — keep floor low; legit cheap cars exist.
  'Hyundai': 600,
  'Kia': 600,
  'Renault Korea': 600,
  // Niche
  'BYD': 5000,
  'Suzuki': 1000,
  'Jeep': 2000,
};

function getPriceFloorEur(makeCanonical) {
  return PRICE_FLOOR_EUR_BY_MAKE[makeCanonical] ?? PRICE_FLOOR_EUR_DEFAULT;
}

// Hard ceiling. Any listing whose computed EUR price (post-markup) is
// above this gets dropped entirely — we don't import six-figure cars
// onto the platform. Override at runtime with SCRAPER_MAX_PRICE_EUR.
const PRICE_CEILING_EUR =
  parsePositiveInt(process.env.SCRAPER_MAX_PRICE_EUR) || 50000;

// Headers chosen to closely match what Chrome 122 sends. Encar's WAF
// returns HTTP 407 for clients that look "too automated" (no cookies,
// missing sec-* headers, suspicious User-Agent), so we go out of our
// way to look like a real browser session.
const ENCAR_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  Referer: 'https://www.encar.com/',
  Origin: 'https://www.encar.com',
  // Client hints / Fetch metadata — modern Chrome always sends these.
  'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
};

// ---- Client pool (one entry per proxy + cookie jar) -----------------------
//
// Each pool entry is a self-contained "browser session": its own axios
// instance, its own cookie jar, its own bootstrap state. Round-robin
// across the pool spreads our request load over multiple proxy IPs
// while keeping each session's cookies tied to one IP (sharing
// cookies across IPs is itself a bot-detection signal).
//
// When no proxies are configured (proxy.txt missing/empty), the pool
// has a single direct-connection entry — behaviour identical to the
// previous single-client implementation.

const { HttpsProxyAgent } = require('https-proxy-agent');
const { loadProxies, describeProxy } = require('./proxies');

function createEncarClient(proxyUrl) {
  const agent = proxyUrl
    ? new HttpsProxyAgent(proxyUrl, {
        keepAlive: true,
        keepAliveMsecs: 30_000,
        maxSockets: 8,
        maxFreeSockets: 4,
      })
    : new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 30_000,
        maxSockets: 8,
        maxFreeSockets: 4,
        scheduling: 'lifo',
      });

  const client = {
    proxyUrl,
    agent,
    cookieJar: new Map(),
    bootstrapped: false,
    consecutiveFailures: 0,
    cooldownUntil: 0,
    label: proxyUrl ? describeProxy(proxyUrl) : 'direct',
    instance: null, // populated below
  };

  client.instance = axios.create({
    timeout: REQUEST_TIMEOUT_MS,
    headers: ENCAR_HEADERS,
    httpsAgent: agent,
    proxy: false, // we handle the proxy via the agent
  });

  // Per-client cookie interceptors.
  client.instance.interceptors.request.use((config) => {
    const cookie = buildCookieHeaderFor(client);
    if (cookie) config.headers.Cookie = cookie;
    return config;
  });
  client.instance.interceptors.response.use(
    (response) => {
      harvestCookiesInto(client, response.headers?.['set-cookie']);
      return response;
    },
    (error) => {
      harvestCookiesInto(client, error.response?.headers?.['set-cookie']);
      return Promise.reject(error);
    }
  );

  return client;
}

function harvestCookiesInto(client, setCookieHeaders) {
  if (!setCookieHeaders) return;
  const list = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : [setCookieHeaders];
  for (const sc of list) {
    if (typeof sc !== 'string') continue;
    const [pair] = sc.split(';');
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name) client.cookieJar.set(name, value);
  }
}

function buildCookieHeaderFor(client) {
  if (client.cookieJar.size === 0) return null;
  return Array.from(client.cookieJar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

const clientPool = []; // populated by initClientPool
let clientCursor = 0;
const PROXY_FAILURE_LIMIT = 3;
const PROXY_COOLDOWN_MS = 60_000;

async function initClientPool() {
  if (clientPool.length) return clientPool;
  let proxies = [];
  const proxiesDisabled =
    process.env.SCRAPER_DISABLE_PROXIES === '1' ||
    process.env.SCRAPER_DISABLE_PROXIES === 'true';
  if (proxiesDisabled) {
    console.log('Proxies disabled via SCRAPER_DISABLE_PROXIES — using direct connection.');
  } else {
    try {
      proxies = await loadProxies();
    } catch (error) {
      console.warn(`Proxy load failed: ${error.message}`);
    }
  }
  if (proxies.length) {
    for (const proxy of proxies) clientPool.push(createEncarClient(proxy));
    console.log(
      `Loaded ${proxies.length} proxy${proxies.length === 1 ? '' : 's'}: ` +
        proxies.map(describeProxy).join(', ')
    );
  } else {
    clientPool.push(createEncarClient(null));
    console.log('No proxies configured — using direct connection.');
  }
  return clientPool;
}

/** Pick the next healthy client (round-robin, skips cooled-down clients). */
function pickClient() {
  if (clientPool.length === 0) {
    throw new Error('Client pool not initialised. Call initClientPool() first.');
  }
  const now = Date.now();
  for (let i = 0; i < clientPool.length; i += 1) {
    const c = clientPool[(clientCursor + i) % clientPool.length];
    if (c.cooldownUntil <= now) {
      clientCursor = (clientCursor + i + 1) % clientPool.length;
      return c;
    }
  }
  // Everyone's cooling down — pick the one closest to recovery.
  const earliest = [...clientPool].sort((a, b) => a.cooldownUntil - b.cooldownUntil)[0];
  return earliest;
}

function markClientHealthy(client) {
  client.consecutiveFailures = 0;
}

function markClientFailed(client) {
  client.consecutiveFailures += 1;
  if (client.consecutiveFailures >= PROXY_FAILURE_LIMIT) {
    client.cooldownUntil = Date.now() + PROXY_COOLDOWN_MS;
    console.warn(
      `Client ${client.label} cooled down for ${PROXY_COOLDOWN_MS / 1000}s ` +
        `after ${client.consecutiveFailures} consecutive failures.`
    );
    client.consecutiveFailures = 0;
  }
}

/**
 * Visit encar.com's homepage + a search page through THIS client to
 * acquire its own session cookies. Idempotent unless force=true.
 */
async function bootstrapClient(client, { force = false } = {}) {
  if (!force && client.bootstrapped) return;
  if (force) client.cookieJar.clear();

  const browseHeaders = {
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'Upgrade-Insecure-Requests': '1',
  };

  try {
    await client.instance.get('https://www.encar.com/', {
      headers: browseHeaders,
      maxRedirects: 5,
      validateStatus: () => true,
    });
    await client.instance.get(
      'https://www.encar.com/dc/dc_carsearchlist.do?carType=for',
      {
        headers: {
          ...browseHeaders,
          'sec-fetch-site': 'same-origin',
          Referer: 'https://www.encar.com/',
        },
        maxRedirects: 5,
        validateStatus: () => true,
      }
    );
    client.bootstrapped = true;
    console.log(
      `Session bootstrapped via ${client.label} (${client.cookieJar.size} cookies).`
    );
  } catch (error) {
    console.warn(
      `Session bootstrap via ${client.label} failed: ${error.message}`
    );
  }
}

/** Bootstrap every client in the pool sequentially. */
async function bootstrapSession({ force = false } = {}) {
  await initClientPool();
  for (const client of clientPool) {
    await bootstrapClient(client, { force });
  }
}

const TARGET_MAKES = [
  { key: 'benz', canonicalName: 'Mercedes-Benz', queryManufacturer: '벤츠', aliases: ['benz', 'mercedes', 'mercedes benz', 'mercedes-benz'] },
  { key: 'bmw', canonicalName: 'BMW', queryManufacturer: 'BMW', aliases: ['bmw'] },
  { key: 'kia', canonicalName: 'Kia', queryManufacturer: '기아', aliases: ['kia'] },
  { key: 'audi', canonicalName: 'Audi', queryManufacturer: '아우디', aliases: ['audi'] },
  { key: 'jeep', canonicalName: 'Jeep', queryManufacturer: '지프', aliases: ['jeep'] },
  { key: 'mazda', canonicalName: 'Mazda', queryManufacturer: '마쯔다', aliases: ['mazda'] },
  { key: 'nissan', canonicalName: 'Nissan', queryManufacturer: '닛산', aliases: ['nissan'] },
  { key: 'peugeot', canonicalName: 'Peugeot', queryManufacturer: '푸조', aliases: ['peugeot', 'pezho'] },
  { key: 'renault-korea', canonicalName: 'Renault Korea', queryManufacturer: '르노코리아(삼성)', aliases: ['renault', 'renault samsung', 'renault-samsung', 'samsung renault'] },
  { key: 'volvo', canonicalName: 'Volvo', queryManufacturer: '볼보', aliases: ['volvo'] },
  { key: 'suzuki', canonicalName: 'Suzuki', queryManufacturer: '스즈키', aliases: ['suzuki'] },
  { key: 'tesla', canonicalName: 'Tesla', queryManufacturer: '테슬라', aliases: ['tesla'] },
  { key: 'smart', canonicalName: 'Smart', queryManufacturer: '스마트', aliases: ['smart'] },
  { key: 'porsche', canonicalName: 'Porsche', queryManufacturer: '포르쉐', aliases: ['porsche', 'porche'] },
  { key: 'lexus', canonicalName: 'Lexus', queryManufacturer: '렉서스', aliases: ['lexus', 'leuxs'] },
  { key: 'jaguar', canonicalName: 'Jaguar', queryManufacturer: '재규어', aliases: ['jaguar'] },
  { key: 'hyundai', canonicalName: 'Hyundai', queryManufacturer: '현대', aliases: ['hyundai', 'hyunday'] },
  { key: 'honda', canonicalName: 'Honda', queryManufacturer: '혼다', aliases: ['honda'] },
  { key: 'ford', canonicalName: 'Ford', queryManufacturer: '포드', aliases: ['ford'] },
  { key: 'fiat', canonicalName: 'Fiat', queryManufacturer: '피아트', aliases: ['fiat'] },
  { key: 'toyota', canonicalName: 'Toyota', queryManufacturer: '도요타', aliases: ['toyota'] },
  { key: 'byd', canonicalName: 'BYD', queryManufacturer: 'BYD', aliases: ['byd'] },
  { key: 'aston-martin', canonicalName: 'Aston Martin', queryManufacturer: '애스턴마틴', aliases: ['aston martin', 'aston-martin'] },
  { key: 'ferrari', canonicalName: 'Ferrari', queryManufacturer: '페라리', aliases: ['ferrari', 'ferraria'] },
  { key: 'volkswagen', canonicalName: 'Volkswagen', queryManufacturer: '폭스바겐', aliases: ['volkswagen', 'vw'] },
];

const TARGETS_BY_ALIAS = new Map();
for (const target of TARGET_MAKES) {
  for (const alias of [target.key, ...target.aliases]) {
    TARGETS_BY_ALIAS.set(normalizeAlias(alias), target);
  }
}

const SOURCE = 'encar';

// -----------------------------------------------------------------------------
// Supabase
// -----------------------------------------------------------------------------

// Lazily-initialised so the module can be imported (and pure helpers
// exercised) without Supabase env vars set.
let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  _supabase = createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_KEY'),
    { auth: { persistSession: false } }
  );
  return _supabase;
}

// -----------------------------------------------------------------------------
// Generic helpers
// -----------------------------------------------------------------------------

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toInteger(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value) {
  return String(value || '').trim();
}

function normalizeAlias(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray(items, chunkSize) {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function uniqueItems(items) {
  return Array.from(new Set(items));
}

// -----------------------------------------------------------------------------
// HTTP retry + Encar pagination
// -----------------------------------------------------------------------------

function isRetriableError(error) {
  const status = error.response?.status;
  // Network-level errors (no status, ECONNRESET, EAI_AGAIN, etc.) — retriable.
  if (!status) return true;
  // 407/429 are rate-limiter style; 5xx are transient server errors;
  // 408 is request timeout. All retriable.
  return [407, 408, 429, 500, 502, 503, 504].includes(status);
}

function isConnectionResetError(error) {
  // Network-level errors with no HTTP status. Encar's edge sometimes
  // drops the TCP connection (ECONNRESET) instead of returning 407 when
  // it wants us to slow down — same WAF, different signal.
  if (error.response) return false;
  const code = error.code || error.cause?.code;
  return ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE'].includes(code);
}

function isRateLimitError(error) {
  const status = error.response?.status;
  // Treat connection-level errors AND 407/429 as rate-limit signals so we
  // back off significantly longer than a normal 5xx.
  if (!status) return true;
  return status === 407 || status === 429;
}

function describeHttpError(error) {
  if (error.response) return `HTTP ${error.response.status}`;
  return error.message;
}

// Refresh every client's session. Used by the circuit breaker after a
// global cooldown — single-flight so concurrent callers share the work.
let _refreshing = null;
async function refreshAllSessions() {
  if (_refreshing) return _refreshing;
  _refreshing = bootstrapSession({ force: true })
    .catch((e) => console.warn(`Session refresh failed: ${e.message}`))
    .finally(() => {
      _refreshing = null;
    });
  return _refreshing;
}

// ---- Circuit breaker -------------------------------------------------------
// When too many requests fail in a short window (rate limit, ECONNRESET burst,
// 407 storm), all in-flight callers wait on a single shared cooldown promise.
// This stops the death spiral where every concurrent worker piles up retries.
const ERROR_BURST_THRESHOLD = 6;          // errors within ERROR_BURST_WINDOW_MS
const ERROR_BURST_WINDOW_MS = 30_000;
const COOLDOWN_MS = 60_000;
let _errorTimestamps = [];
let _cooldownPromise = null;

function recordWafLikeError() {
  const now = Date.now();
  _errorTimestamps = _errorTimestamps.filter(
    (t) => now - t < ERROR_BURST_WINDOW_MS
  );
  _errorTimestamps.push(now);
  if (
    _errorTimestamps.length >= ERROR_BURST_THRESHOLD &&
    !_cooldownPromise
  ) {
    _cooldownPromise = (async () => {
      console.warn(
        `Circuit breaker tripped (${_errorTimestamps.length} errors in ` +
          `${ERROR_BURST_WINDOW_MS / 1000}s). Cooling down ${COOLDOWN_MS / 1000}s and ` +
          'refreshing the Encar session…'
      );
      await sleep(COOLDOWN_MS);
      _errorTimestamps = [];
      try {
        await refreshAllSessions();
      } catch {
        /* already logged */
      }
      console.warn('Circuit breaker resumed.');
    })().finally(() => {
      _cooldownPromise = null;
    });
  }
  return _cooldownPromise;
}

async function getWithRetry(url, config, label) {
  // Lazy-initialise the proxy pool on first use so callers don't need
  // to remember to call initClientPool() themselves. After the first
  // request, this returns instantly (clientPool already has entries).
  if (clientPool.length === 0) await initClientPool();
  // If a global cooldown is in progress, wait for it before doing anything.
  if (_cooldownPromise) await _cooldownPromise;

  let lastError;
  let lastClient = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    // Pick a (potentially different) client per attempt so failures on
    // one proxy automatically retry on a different IP.
    const client = pickClient();
    lastClient = client;
    try {
      const response = await client.instance.get(url, config);
      markClientHealthy(client);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= MAX_RETRIES || !isRetriableError(error)) break;

      const status = error.response?.status;

      // Track WAF-like signals in the circuit breaker. Both HTTP 407
      // (explicit WAF block) and ECONNRESET-family errors (TCP-level
      // pacing punishment) count.
      if (status === 407 || isConnectionResetError(error)) {
        markClientFailed(client);
        const cooldown = recordWafLikeError();
        if (cooldown) await cooldown;
      }

      // 407 specifically: the session on THIS client is probably expired
      // or flagged. Re-bootstrap just that client.
      if (status === 407 && attempt === 1) {
        console.warn(
          `${label}: 407 via ${client.label} — refreshing that client's session…`
        );
        await bootstrapClient(client, { force: true });
      }

      // Rate-limit signals get a bigger backoff (5s → 10s → 20s → 40s → 80s
      // capped). Other transients use the lighter 0.5s → 8s curve.
      const baseMs = isRateLimitError(error) ? 5000 : 500;
      const delay = baseMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 500);
      console.warn(
        `${label} failed (${describeHttpError(error)}). ` +
        `Retrying in ${(delay / 1000).toFixed(1)}s [attempt ${attempt}/${MAX_RETRIES}]...`
      );
      await sleep(delay);
    }
  }
  throw new Error(`${label} failed after ${MAX_RETRIES} attempts: ${describeHttpError(lastError)}`);
}

function createSearchRange(offset, limit) {
  return `|ModifiedDate|${offset}|${limit}`;
}

/**
 * Build an Encar `q=` query.
 *
 * Always includes:
 *   - Hidden.N            : exclude hidden listings.
 *   - CarType.A           : include all body types.
 *   - ServiceCopyCar.ORIGINAL : drop dealer-syndicated DUPLICATION rows. Without
 *                          this, ~45% of returned listings are duplicates of the
 *                          same physical car re-posted by partner dealers, which
 *                          would inflate the inventory and pollute search results.
 *   - SellType.일반        : retail only — excludes auctions (경매),
 *                          leases (리스), short/long-term rentals.
 *
 * @param {string} queryManufacturer - Korean manufacturer name (e.g. '벤츠').
 * @param {{from:number, to:number}|null} yearRange - inclusive yyyymm range
 *        (e.g. { from: 202001, to: 202412 }). Use null for "no slice".
 */
function createManufacturerQuery(queryManufacturer, yearRange = null) {
  // Always cap the year window at MIN_REGISTRATION_YEAR. When the caller
  // passes a narrower range (year-bucket slicing), use that range
  // directly — but clamp its lower bound to MIN_YEAR_MM defensively.
  const range = yearRange
    ? { from: Math.max(yearRange.from, MIN_YEAR_MM), to: yearRange.to }
    : { from: MIN_YEAR_MM, to: MAX_YEAR_MM };

  const parts = [
    'Hidden.N',
    'CarType.A',
    `Manufacturer.${queryManufacturer}`,
    'ServiceCopyCar.ORIGINAL',
    'SellType.일반',
    `Year.range(${range.from}..${range.to})`,
  ];
  return `(And.${parts.join('._.')}.)`;
}

async function fetchCount(target, yearRange = null) {
  const response = await getWithRetry(
    ENCAR_SEARCH_URL,
    {
      params: {
        count: 'true',
        q: createManufacturerQuery(target.queryManufacturer, yearRange),
        sr: createSearchRange(0, 1),
      },
    },
    `${target.canonicalName} count${yearRange ? ` (${yearRange.from}..${yearRange.to})` : ''}`
  );
  return toInteger(response.data?.Count) || 0;
}

/**
 * Enumerate year buckets that each fit under SLICING_THRESHOLD. Uses
 * recursive bisection: starts with the full year span, and any bucket
 * whose count is over the threshold is split in half until either the
 * count fits or the bucket is a single month.
 *
 * Returns an array of { from, to, count } in yyyymm form.
 */
async function enumerateYearBuckets(target) {
  const totalFrom = OLDEST_YEAR_BUCKET * 100 + 1;       // e.g. 199501
  const totalTo = NEWEST_YEAR_BUCKET * 100 + 12;        // e.g. 202712
  const result = [];

  async function recurse(from, to) {
    const range = { from, to };
    const count = await fetchCount(target, range);
    if (count === 0) return;
    if (count <= SLICING_THRESHOLD || from === to) {
      result.push({ from, to, count });
      return;
    }
    const mid = midpointYyyymm(from, to);
    if (mid === to) {
      // Can't split further; accept the over-cap bucket. We'll still
      // try to scrape it but flag a warning.
      result.push({ from, to, count, overCap: true });
      return;
    }
    await recurse(from, mid);
    await recurse(addMonth(mid, 1), to);
  }

  await recurse(totalFrom, totalTo);
  return result;
}

// yyyymm helpers --------------------------------------------------------------

function yyyymmToMonths(yyyymm) {
  const y = Math.floor(yyyymm / 100);
  const m = yyyymm % 100;
  return y * 12 + (m - 1);
}

function monthsToYyyymm(totalMonths) {
  const y = Math.floor(totalMonths / 12);
  const m = (totalMonths % 12) + 1;
  return y * 100 + m;
}

function addMonth(yyyymm, deltaMonths) {
  return monthsToYyyymm(yyyymmToMonths(yyyymm) + deltaMonths);
}

function midpointYyyymm(from, to) {
  const a = yyyymmToMonths(from);
  const b = yyyymmToMonths(to);
  if (b <= a) return from;
  return monthsToYyyymm(Math.floor((a + b) / 2));
}

// -----------------------------------------------------------------------------
// Domain-specific normalization
// -----------------------------------------------------------------------------

/**
 * Maps Encar's Korean fuel labels to the values used by the UI filters in
 * src/components/SearchHero.tsx and src/app/cars/page.tsx.
 */
function normalizeFuelType(rawFuel) {
  const source = cleanText(rawFuel);
  if (!source) return null;

  // Plug-in / hybrid combinations resolve to "Hibrid".
  if (source.includes('하이브리드') || source.includes('+전기') || source.includes('+ 전기')) {
    return 'Hibrid';
  }
  if (source.includes('전기')) return 'Elektrik';
  if (source.includes('디젤')) return 'Diesel';
  if (source.includes('가솔린')) return 'Petrol';
  if (source.includes('LPG')) return 'LPG';
  if (source.includes('수소')) return 'Hidrogjen';
  return source; // unknown — preserve raw so we can extend the map later
}

/**
 * Encar's `Year` is yyyymm (e.g. 202305). FormYear is just yyyy.
 * Returns { year, month } where month may be null.
 */
function extractRegistration(item) {
  const rawYear = cleanText(item.Year);
  if (rawYear.length >= 6) {
    const year = toInteger(rawYear.slice(0, 4));
    const month = toInteger(rawYear.slice(4, 6));
    if (year) {
      return {
        year,
        month: month && month >= 1 && month <= 12 ? month : null,
      };
    }
  }
  const formYear = toInteger(item.FormYear);
  if (formYear) return { year: formYear, month: null };
  return { year: null, month: null };
}

function buildImageUrls(item) {
  const urls = [];
  if (Array.isArray(item.Photos)) {
    for (const photo of item.Photos) {
      if (photo?.location) urls.push(`${ENCAR_IMAGE_HOST}${photo.location}`);
    }
  }
  if (!urls.length && item.Photo) {
    urls.push(`${ENCAR_IMAGE_HOST}${item.Photo}001.jpg`);
  }
  return uniqueItems(urls);
}

// ---------------------------------------------------------------------------
// Detail endpoint: enrich each listing with its full photo gallery and the
// fields that the search/list endpoint never returns (body type, gearbox,
// engine displacement, color, exact price, dealer info).
// ---------------------------------------------------------------------------

/**
 * Fetch the full detail document for one Encar vehicle ID.
 * Returns the parsed JSON or null if the listing has been removed.
 */
async function fetchVehicleDetail(sourceId) {
  try {
    const response = await getWithRetry(
      `${ENCAR_DETAIL_URL}/${encodeURIComponent(sourceId)}`,
      { headers: { Referer: 'https://fem.encar.com/' } },
      `Detail ${sourceId}`
    );
    return response.data || null;
  } catch (error) {
    // 404s are expected for listings that disappeared between list and
    // detail fetch — treat as missing rather than fatal.
    if (error.message.includes('HTTP 404')) return null;
    throw error;
  }
}

// Map Encar's Korean transmission name to the UI's value set.
function normalizeTransmission(rawName) {
  const text = cleanText(rawName);
  if (!text) return null;
  if (/오토|자동|automatic|cvt|dct|dsg/i.test(text)) return 'Automatik';
  if (/수동|manual|매뉴얼/i.test(text)) return 'Manual';
  return text; // unknown — keep raw for visibility
}

// Combine every body-related signal Encar gives us (size class in
// `spec.bodyName`, model name, trim/grade) and bucket the listing into
// one of the UI's body-type filter values: SUV, Sedan, Kupe, Kabriolet,
// Furgon, Hatchback, Wagon. Returns null if nothing matches.
function inferBodyType({ bodyName, modelName, gradeName }) {
  const haystack = [bodyName, modelName, gradeName].filter(Boolean).join(' ');
  if (!haystack) return null;
  // Specific shapes — match before size-class fallbacks.
  if (/Convertible|Cabriolet|Roadster|컨버터블|카브리올레|로드스터/i.test(haystack))
    return 'Kabriolet';
  if (/SUV|크로스오버|RV/i.test(haystack)) return 'SUV';
  if (/Pickup|픽업|Truck|화물|Van\b|미니밴|승합|VAN/i.test(haystack)) return 'Furgon';
  if (/Hatchback|해치백/i.test(haystack)) return 'Hatchback';
  if (/Wagon|Estate|Touring|왜건|에스테이트|Avant/i.test(haystack)) return 'Wagon';
  if (/Coupe|coupé|쿠페|Coupé/i.test(haystack)) return 'Kupe';
  if (/Sedan|세단/i.test(haystack)) return 'Sedan';
  // Size-class fallbacks — most "size class" listings are sedans.
  if (/스포츠카/i.test(haystack)) return 'Kupe';
  if (/대형차|중형차|준중형차|준대형차|소형차|경차/i.test(haystack)) return 'Sedan';
  return null;
}

/**
 * Apply the rich detail payload back onto a row that was produced from
 * the list endpoint. We never overwrite a non-null list value with a
 * null detail value.
 */
function enrichRowWithDetail(row, detail, target, exchangeRate) {
  if (!detail) return row;

  // ---- photos: replace the 4-photo sample with the full gallery ----
  // Encar tags each photo with a `type`: OUTER (exterior), INNER (interior),
  // OPTION (detail shots — wheels, buttons, badges). We sort so OUTER
  // photos come first (by ascending code), then INNER, then OPTION. This
  // ensures `image_url` (= first photo) is always a clean exterior shot
  // rather than a random close-up of a wheel or start button.
  if (Array.isArray(detail.photos) && detail.photos.length) {
    const TYPE_ORDER = { OUTER: 0, INNER: 1, OPTION: 2 };
    const sorted = detail.photos
      .filter((p) => p?.path)
      .sort((a, b) => {
        const ta = TYPE_ORDER[a.type] ?? 3;
        const tb = TYPE_ORDER[b.type] ?? 3;
        if (ta !== tb) return ta - tb;
        // Within the same type, sort by code ascending so "001" (the
        // canonical front 3/4 hero shot) comes before "002", "003", etc.
        return (a.code || '').localeCompare(b.code || '');
      });
    const urls = uniqueItems(
      sorted.map((p) => `${ENCAR_IMAGE_HOST}${p.path}`)
    );
    if (urls.length) {
      row.images = urls;
      row.image_url = urls[0];
      row.photo_count = urls.length;
    }
  }

  // ---- model / trim: prefer the pre-translated English names ----
  // Encar already maintains English equivalents for most imports, so we
  // skip our translation pipeline whenever possible.
  const cat = detail.category || {};
  const englishModel = cleanText(cat.modelGroupEnglishName);
  const koreanModel = cleanText(cat.modelGroupName);
  if (englishModel) {
    row.model = englishModel;
  } else if (koreanModel) {
    row.model = translate(koreanModel);
  }

  const englishGrade = cleanText(cat.gradeEnglishName);
  const englishGradeDetail = cleanText(cat.gradeDetailEnglishName);
  const koreanGrade = cleanText(cat.gradeName);
  let trim = englishGrade || (koreanGrade ? translate(koreanGrade) : null);
  if (englishGradeDetail && englishGradeDetail !== englishGrade) {
    trim = trim ? `${trim} ${englishGradeDetail}` : englishGradeDetail;
  }
  if (trim) row.trim = trim.replace(/\s+/g, ' ').trim();

  // ---- body_type from combined signals ----
  const spec = detail.spec || {};
  const inferredBody = inferBodyType({
    bodyName: spec.bodyName,
    modelName: row.model,
    gradeName: trim,
  });
  if (inferredBody) row.body_type = inferredBody;

  // ---- transmission ----
  if (spec.transmissionName) {
    const tx = normalizeTransmission(spec.transmissionName);
    if (tx) row.transmission = tx;
  }

  // ---- price: prefer the live ad price (more accurate than list cache) ----
  const adPrice = detail.advertisement?.price;
  if (typeof adPrice === 'number' && adPrice > 0) {
    const refreshed = convertKrwToEuro(adPrice * 10000, exchangeRate);
    if (refreshed != null) {
      // Live ad price exceeds the ceiling: drop the listing entirely.
      if (refreshed > PRICE_CEILING_EUR) {
        row.__dropAboveCeiling = true;
        return row;
      }
      const floor = getPriceFloorEur(target.canonicalName);
      row.price_eur = refreshed >= floor ? refreshed : null;
    }
  }

  // ---- options: standard equipment codes ----
  // Encar returns codes ("001", "014", …) on detail.options.standard.
  // Tuning items often duplicate standard codes (e.g. "023" already
  // appears as standard); we de-dupe and keep both as one set.
  const optionsObj = detail.options || {};
  const optionCodes = uniqueItems(
    [...(optionsObj.standard || []), ...(optionsObj.tuning || [])].filter(Boolean)
  );
  if (optionCodes.length) row.options = optionCodes;

  // ---- VIN (kept inside `raw` for now) ----
  if (detail.vin) row.raw = { ...(row.raw || {}), vin: detail.vin };

  return row;
}

/**
 * Enrich a batch of rows in-place by fetching the detail endpoint for
 * each. Failures are tolerated — a row whose detail request fails keeps
 * its list-only fields. Counters are written back to `shared.meta` so
 * we can see enrichment health in sync_runs.
 */
async function enrichBatchWithDetail(batchRows, target, exchangeRate, shared) {
  if (!batchRows.length) return;
  const startedAt = Date.now();
  const results = await mapWithConcurrency(
    batchRows,
    DETAIL_CONCURRENCY,
    async (row) => {
      try {
        const detail = await fetchVehicleDetail(row.source_id);
        if (!detail) return { ok: false, gone: true };
        enrichRowWithDetail(row, detail, target, exchangeRate);
        if (row.__dropAboveCeiling) return { ok: false, dropped: true };
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    }
  );
  let ok = 0;
  let gone = 0;
  let errored = 0;
  let dropped = 0;
  for (const r of results) {
    if (r?.__error || r?.error) errored += 1;
    else if (r?.gone) gone += 1;
    else if (r?.dropped) dropped += 1;
    else if (r?.ok) ok += 1;
  }
  // Filter out dropped rows in-place so callers never see them.
  for (let i = batchRows.length - 1; i >= 0; i -= 1) {
    if (batchRows[i].__dropAboveCeiling) batchRows.splice(i, 1);
  }
  if (dropped > 0) {
    shared.priceAboveCeiling = (shared.priceAboveCeiling || 0) + dropped;
    shared.normalizedCount -= dropped;
  }
  shared.detailFetched = (shared.detailFetched || 0) + ok;
  shared.detailGone = (shared.detailGone || 0) + gone;
  shared.detailErrored = (shared.detailErrored || 0) + errored;
  if (errored > 0) {
    const ratio = errored / batchRows.length;
    if (ratio > 0.2) {
      shared.warnings.push(
        `Detail enrichment failed for ${errored}/${batchRows.length} ` +
        `listings in this batch (${(ratio * 100).toFixed(0)}%)`
      );
    }
  }
  const ms = Date.now() - startedAt;
  if (ms > 0) {
    process.stdout.write(
      `   enriched ${ok}/${batchRows.length} in ${(ms / 1000).toFixed(1)}s\r`
    );
  }
}

/**
 * Run an async worker over `items` with at most `concurrency` in flight.
 * Mirrors a simple worker-pool pattern; results array preserves input order.
 */
async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function pullNext() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      try {
        results[i] = await worker(items[i], i);
      } catch (error) {
        results[i] = { __error: error };
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, pullNext);
  await Promise.all(workers);
  return results;
}

function convertKrwToEuro(originalPriceKrw, exchangeRate) {
  // Treat 0 / null / missing as "price on request". Encar uses Price=0 as
  // a placeholder for listings where the seller hides the price; without
  // this guard those listings would show up as exactly €PRICE_MARKUP_EUR.
  if (!originalPriceKrw || originalPriceKrw <= 0) return null;
  const baseEur = originalPriceKrw * exchangeRate;
  const markup = getMarkupForBaseEur(baseEur);
  return Math.round(baseEur + markup);
}

function buildSellerLogo(name) {
  const text = cleanText(name);
  if (!text) return null;
  // First letters of up to 2 words, uppercase. e.g. "Auto World" -> "AW".
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/**
 * Convert one Encar listing to a row that matches public.cars.
 * Returns { row, errors } - row is null if validation fails.
 */
function normalizeListing(item, target, exchangeRate) {
  const errors = [];
  const sourceId = cleanText(item.Id);
  const { year, month } = extractRegistration(item);
  const priceManwon = toInteger(item.Price);
  const mileageKm = toInteger(item.Mileage);
  const modelName = cleanText(item.Model);

  if (!sourceId) errors.push('missing Id');
  if (!year) errors.push('missing year');
  if (!modelName) errors.push('missing model');

  const images = buildImageUrls(item);
  if (images.length <= 1) errors.push('only 1 photo');

  // Encar reports Price in 만원 (man-won, ₩10,000). 0 means hidden/"call".
  const priceKrw = priceManwon && priceManwon > 0 ? priceManwon * 10000 : null;
  const computedPriceEur = convertKrwToEuro(priceKrw, exchangeRate);

  // Hard ceiling: drop any listing whose computed price exceeds the cap.
  // We don't import six-figure cars onto the platform — they hurt the
  // perceived inventory range and almost never sell through us.
  if (computedPriceEur != null && computedPriceEur > PRICE_CEILING_EUR) {
    errors.push(`price €${computedPriceEur} exceeds €${PRICE_CEILING_EUR} ceiling`);
  }

  if (errors.length) return { row: null, errors };

  const priceFloor = getPriceFloorEur(target.canonicalName);
  const priceBelowFloor =
    computedPriceEur != null && computedPriceEur < priceFloor;
  // Below-floor prices are almost certainly mis-listed (test entries,
  // dealer-internal placeholders, parts-only listings, etc.). Treat the
  // price as unknown so the UI shows "Kontakto për çmimin".
  const priceEur = priceBelowFloor ? null : computedPriceEur;

  const rawSeller = cleanText(item.OfficeCityState) || null;
  const sellerName = rawSeller ? translateRegion(rawSeller) : null;
  const rawTrim = cleanText(item.Badge) || null;

  const row = {
    id: `${SOURCE}:${sourceId}`,
    source: SOURCE,
    source_id: sourceId,

    make: target.canonicalName,
    model: translate(modelName),
    trim: rawTrim ? translate(rawTrim) : null,
    body_type: null, // not available on the list endpoint

    registration_year: year,
    registration_month: month,

    fuel_type: normalizeFuelType(item.FuelType),
    transmission: null, // not available on the list endpoint

    price_eur: priceEur,
    mileage_km: mileageKm,
    power_kw: null,
    power_hp: null,

    image_url: images[0] || null,
    images,
    photo_count: images.length,

    seller_name: sellerName,
    seller_address: sellerName, // Encar list only exposes city/state
    seller_logo: buildSellerLogo(sellerName),

    finance_monthly_eur: null,
    insurance_monthly_eur: null,

    // Filled in during detail-endpoint enrichment (see enrichRowWithDetail).
    options: [],

    raw: item,
  };

  return { row, errors: [], priceBelowFloor };
}

// -----------------------------------------------------------------------------
// Target resolution (carlist.txt / SCRAPER_TARGETS / CLI args)
// -----------------------------------------------------------------------------

async function loadRequestedAliases(options = {}) {
  if (Array.isArray(options.targetAliases) && options.targetAliases.length) {
    return options.targetAliases;
  }
  const envAliases = cleanText(process.env.SCRAPER_TARGETS);
  if (envAliases) {
    return envAliases.split(',').map((a) => a.trim()).filter(Boolean);
  }
  const filePath = options.carListPath || CARLIST_PATH;
  const content = await fs.readFile(filePath, 'utf8');
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function loadTargetManufacturers(options = {}) {
  const requestedAliases = await loadRequestedAliases(options);
  const targets = [];
  const unknownAliases = [];
  const seenKeys = new Set();

  for (const alias of requestedAliases) {
    const target = TARGETS_BY_ALIAS.get(normalizeAlias(alias));
    if (!target) {
      unknownAliases.push(alias);
      continue;
    }
    if (seenKeys.has(target.key)) continue;
    seenKeys.add(target.key);
    targets.push(target);
  }

  if (!targets.length) {
    throw new Error('No supported makes were resolved from carlist.txt or SCRAPER_TARGETS.');
  }
  return { requestedAliases, targets, unknownAliases };
}

async function fetchExchangeRate() {
  // The exchange rate comes from a public CDN, not Encar — it has no
  // reason to consume a slot on our Encar proxy pool, and it doesn't
  // need cookies or browser fingerprint headers either. Plain axios.
  try {
    const response = await axios.get(EXCHANGE_RATE_URL, {
      timeout: 10000,
      headers: { 'User-Agent': 'dreshaj-scraper/1.0' },
    });
    const rate = toFiniteNumber(response.data?.krw?.eur);
    if (!rate || rate <= 0) throw new Error('Invalid exchange rate payload');
    if (rate < FX_RATE_MIN || rate > FX_RATE_MAX) {
      throw new Error(
        `Live rate ${rate} is outside the sane band ` +
        `[${FX_RATE_MIN}, ${FX_RATE_MAX}] — refusing to use it`
      );
    }
    console.log(
      `Live exchange rate: 1 KRW = ${rate} EUR ` +
      `(1 EUR = ${(1 / rate).toFixed(0)} KRW)`
    );
    return rate;
  } catch (error) {
    console.warn(`Falling back to static exchange rate (${FALLBACK_KRW_TO_EUR_RATE}): ${error.message}`);
    return FALLBACK_KRW_TO_EUR_RATE;
  }
}

// -----------------------------------------------------------------------------
// Per-make pagination
// -----------------------------------------------------------------------------

// Walks pagination for a single query bucket (optionally narrowed by year
// range) and feeds rows into the shared accumulator. Mutates `shared`.
async function _walkBucket(target, yearRange, options, shared) {
  const pageSize = options.pageSize || PAGE_SIZE;
  const exchangeRate = options.exchangeRate || FALLBACK_KRW_TO_EUR_RATE;
  const onRowsBatch = options.onRowsBatch;
  const remaining = options.remaining; // () => number | Infinity
  const query = createManufacturerQuery(target.queryManufacturer, yearRange);
  let offset = 0;
  let bucketAdded = 0;
  let bucketCount = null;
  // Snapshot pageFailures so the 3-strikes rule applies per-bucket, not
  // across the whole make.
  shared.pageFailuresAtBucketStart = shared.pageFailures;

  while (true) {
    const cap = remaining ? remaining() : Infinity;
    if (cap <= 0) return { bucketAdded, bucketCount };

    const limit = Math.min(pageSize, cap);

    let response;
    try {
      response = await getWithRetry(
        ENCAR_SEARCH_URL,
        {
          params: {
            count: 'true',
            q: query,
            sr: createSearchRange(offset, limit),
          },
        },
        `${target.canonicalName} listings${yearRange ? ` ${yearRange.from}..${yearRange.to}` : ''} @${offset}`
      );
    } catch (error) {
      shared.pageFailures += 1;
      shared.warnings.push(
        `Failed at offset ${offset}${yearRange ? ` (${yearRange.from}..${yearRange.to})` : ''}: ${error.message}`
      );
      // After 3 consecutive page failures in this bucket, give up — the
      // server is clearly unhappy and we should not hammer it. The
      // overall sync still succeeds with whatever we already saved; the
      // next scheduled run picks up where we left off.
      if (shared.pageFailures - shared.pageFailuresAtBucketStart >= 3) {
        shared.warnings.push(
          `Aborting bucket${yearRange ? ` ${yearRange.from}..${yearRange.to}` : ''} after 3 page failures.`
        );
        return { bucketAdded, bucketCount };
      }
      // Otherwise skip this page and try the next offset. We lose the
      // listings on this single page but keep the bucket alive.
      console.warn(
        `   skipping offset ${offset}, advancing to ${offset + limit}…`
      );
      offset += limit;
      await sleep(2000); // small breather before pushing on
      continue;
    }

    const data = response.data || {};
    const results = Array.isArray(data.SearchResults) ? data.SearchResults : [];
    if (bucketCount === null) bucketCount = toInteger(data.Count) || 0;
    if (!results.length) return { bucketAdded, bucketCount };

    const batchRows = [];
    const sizeBefore = shared.seenSourceIds.size;

    // Pre-pass: collect candidate IDs so we can ask the DB which ones
    // are already fresh and skip detail enrichment for them.
    const candidateIds = [];
    for (const item of results) {
      const id = cleanText(item.Id);
      if (id && !shared.seenSourceIds.has(id)) candidateIds.push(id);
    }
    const freshIds =
      options.skipFreshHours && options.skipFreshHours > 0
        ? await fetchFreshSourceIds(candidateIds, options.skipFreshHours)
        : new Set();

    for (const item of results) {
      const sourceId = cleanText(item.Id);
      if (!sourceId) {
        shared.skippedListings += 1;
        if (shared.validationSamples.length < 5) shared.validationSamples.push('listing without Id');
        continue;
      }

      if (shared.seenSourceIds.has(sourceId)) {
        shared.duplicateCount += 1;
        continue;
      }
      shared.seenSourceIds.add(sourceId);

      // Skip-if-fresh: the DB already has a recent copy of this row,
      // so we don't need to refetch the detail endpoint or upsert.
      // We still added to seenSourceIds, so the deletion safeguard
      // continues to know the listing exists.
      if (freshIds.has(sourceId)) {
        shared.freshSkipped += 1;
        if (remaining && shared.seenSourceIds.size >= shared.maxListings) break;
        continue;
      }

      const { row, errors, priceBelowFloor } = normalizeListing(item, target, exchangeRate);
      if (!row) {
        shared.skippedListings += 1;
        if (shared.validationSamples.length < 5) {
          shared.validationSamples.push(`${sourceId}: ${errors.join(', ')}`);
        }
        continue;
      }
      if (priceBelowFloor) shared.priceBelowFloor += 1;

      batchRows.push(row);

      if (remaining && shared.seenSourceIds.size >= shared.maxListings) break;
    }

    if (batchRows.length && options.enrichWithDetail !== false) {
      await enrichBatchWithDetail(batchRows, target, exchangeRate, shared);
    }

    if (onRowsBatch && batchRows.length) {
      await onRowsBatch(batchRows);
    } else {
      shared.rows.push(...batchRows);
    }
    shared.normalizedCount += batchRows.length;
    bucketAdded += batchRows.length;

    if (shared.seenSourceIds.size - sizeBefore === 0) {
      shared.warnings.push(
        `Encar repeated an already-seen page at offset ${offset}` +
        `${yearRange ? ` for ${yearRange.from}..${yearRange.to}` : ''}.`
      );
      return { bucketAdded, bucketCount };
    }

    offset += results.length;
    if (results.length < limit) return { bucketAdded, bucketCount };
    if (remaining && shared.seenSourceIds.size >= shared.maxListings) {
      return { bucketAdded, bucketCount };
    }
    // Pause between pages. The previous batch just bursted ~500
    // detail fetches; giving Encar's edge a beat before the next list
    // call dramatically reduces 407s. 1.5s is enough.
    await sleep(1500);
  }
}

async function fetchManufacturerCars(target, options = {}) {
  const exchangeRate = options.exchangeRate || FALLBACK_KRW_TO_EUR_RATE;
  const maxListingsPerMake = parsePositiveInt(options.maxListingsPerMake) || null;

  const shared = {
    seenSourceIds: new Set(),
    rows: [],
    warnings: [],
    validationSamples: [],
    duplicateCount: 0,
    skippedListings: 0,
    normalizedCount: 0,
    priceBelowFloor: 0,
    freshSkipped: 0,
    pageFailures: 0,
    maxListings: maxListingsPerMake ?? Infinity,
  };

  // Up-front total count, used to decide on slicing and to flag underfetch.
  let initialCount = 0;
  try {
    initialCount = await fetchCount(target);
  } catch (error) {
    shared.warnings.push(`Initial count failed: ${error.message}`);
  }

  console.log(
    `[${target.canonicalName}] ${initialCount.toLocaleString()} listings reported` +
    `${maxListingsPerMake ? `, capped at ${maxListingsPerMake}` : ''}.`
  );

  const remaining = () =>
    maxListingsPerMake === null ? Infinity : maxListingsPerMake - shared.seenSourceIds.size;

  // Decide on slicing. If under the threshold, single bucket with no year
  // filter; otherwise enumerate year buckets that fit.
  let buckets;
  if (initialCount === 0 || initialCount <= SLICING_THRESHOLD) {
    buckets = [null];
  } else {
    console.log(
      `[${target.canonicalName}] Over ${SLICING_THRESHOLD.toLocaleString()} threshold; slicing by year…`
    );
    try {
      buckets = await enumerateYearBuckets(target);
      console.log(`[${target.canonicalName}] ${buckets.length} year buckets:`);
      for (const b of buckets) {
        console.log(
          `   ${b.from}..${b.to}  ${b.count.toLocaleString()}` +
          `${b.overCap ? '  (over cap, partial)' : ''}`
        );
      }
    } catch (error) {
      shared.warnings.push(`Year-bucket enumeration failed: ${error.message}`);
      buckets = [null];
    }
  }

  for (const bucket of buckets) {
    if (maxListingsPerMake !== null && shared.seenSourceIds.size >= maxListingsPerMake) break;
    await _walkBucket(
      target,
      bucket,
      {
        ...options,
        exchangeRate,
        remaining,
        skipFreshHours: options.skipFreshHours ?? SKIP_FRESH_HOURS,
      },
      shared
    );
    if (bucket?.overCap) {
      shared.warnings.push(
        `Bucket ${bucket.from}..${bucket.to} exceeded the API cap (${bucket.count.toLocaleString()}); ` +
        'some listings in that bucket were not fetched.'
      );
    }
  }

  let finalCount;
  if (maxListingsPerMake === null) {
    try {
      finalCount = await fetchCount(target);
    } catch (error) {
      shared.warnings.push(`Failed to re-check count: ${error.message}`);
      finalCount = initialCount || shared.seenSourceIds.size;
    }
  } else {
    finalCount = Math.min(initialCount || 0, maxListingsPerMake);
  }

  if (shared.validationSamples.length) {
    shared.warnings.push(`Validation samples: ${shared.validationSamples.join(' | ')}`);
  }
  if (finalCount > shared.seenSourceIds.size && maxListingsPerMake === null) {
    shared.warnings.push(
      `Fetched ${shared.seenSourceIds.size} unique listings, but Encar reported ${finalCount} total.`
    );
  }

  const fetchSucceeded = shared.pageFailures === 0;
  // Deletion is safe when:
  //   - no cap: we've seen >= the count Encar reported, so anything in DB
  //     and not in our fetch is genuinely gone.
  //   - capped (e.g. 500 per make): we treat the fetched batch as the
  //     authoritative inventory for that make. Anything outside the
  //     batch is sold / bumped off the top-N and should be removed,
  //     keeping the local DB to a rolling top-N per make.
  const deletionSafe =
    fetchSucceeded &&
    (maxListingsPerMake !== null ||
      shared.seenSourceIds.size >= (finalCount || 0));

  return {
    rows: shared.rows,
    meta: {
      key: target.key,
      canonicalName: target.canonicalName,
      queryManufacturer: target.queryManufacturer,
      initialCount: initialCount || 0,
      finalCount: finalCount || 0,
      fetchedListings: shared.seenSourceIds.size,
      normalizedRows: shared.normalizedCount,
      skippedListings: shared.skippedListings,
      priceBelowFloor: shared.priceBelowFloor,
      freshSkipped: shared.freshSkipped,
      detailFetched: shared.detailFetched || 0,
      detailGone: shared.detailGone || 0,
      detailErrored: shared.detailErrored || 0,
      duplicateCount: shared.duplicateCount,
      fetchSucceeded,
      deletionSafe,
      seenSourceIds: Array.from(shared.seenSourceIds),
      warnings: shared.warnings,
    },
  };
}

// -----------------------------------------------------------------------------
// Supabase persistence (single `cars` table)
// -----------------------------------------------------------------------------

async function executeSupabase(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function upsertCarRows(rows) {
  if (!rows.length) return 0;
  let written = 0;
  for (const chunk of chunkArray(rows, UPSERT_CHUNK_SIZE)) {
    await executeSupabase(
      getSupabase().from('cars').upsert(chunk, { onConflict: 'id' }),
      'Upsert cars'
    );
    written += chunk.length;
  }
  return written;
}

/**
 * Look up which `source_id`s in the given list already have a row in our
 * DB whose `updated_at` is younger than `freshHours`. These rows can
 * skip the detail-endpoint round-trip — they're still considered
 * present (the list endpoint just confirmed it), we just won't refresh
 * their photos/specs.
 *
 * Returns an empty Set if Supabase isn't reachable, the table doesn't
 * exist, or the freshness feature is disabled — i.e. errors fall back
 * to "treat everything as stale" rather than crashing the run.
 */
async function fetchFreshSourceIds(sourceIds, freshHours) {
  if (!freshHours || sourceIds.length === 0) return new Set();
  const cutoff = new Date(Date.now() - freshHours * 3600 * 1000).toISOString();
  try {
    // Chunk to keep .in() under the URL-length safe limit.
    const fresh = new Set();
    for (const chunk of chunkArray(sourceIds, 500)) {
      const { data, error } = await getSupabase()
        .from('cars')
        .select('source_id')
        .eq('source', SOURCE)
        .in('source_id', chunk)
        .gt('updated_at', cutoff);
      if (error) throw error;
      for (const row of data ?? []) fresh.add(String(row.source_id));
    }
    return fresh;
  } catch (error) {
    // First run, missing env, table not yet created — anything that
    // can't tell us "this row is fresh" should fall through to "assume
    // nothing is fresh" so we re-enrich everything.
    return new Set();
  }
}

async function fetchExistingCarIdsForMake(canonicalName) {
  const ids = [];
  let from = 0;
  while (true) {
    const data = await executeSupabase(
      getSupabase()
        .from('cars')
        .select('id, source_id')
        .eq('source', SOURCE)
        .eq('make', canonicalName)
        .range(from, from + SELECT_PAGE_SIZE - 1),
      'Select cars'
    );
    if (!data.length) break;
    for (const row of data) ids.push(row);
    if (data.length < SELECT_PAGE_SIZE) break;
    from += SELECT_PAGE_SIZE;
  }
  return ids;
}

async function deleteMissingListings(makeScopes) {
  let deleted = 0;
  let makesProcessed = 0;
  let makesSkipped = 0;

  for (const scope of makeScopes) {
    if (!scope.deletionSafe) {
      makesSkipped += 1;
      const reason = scope.warnings.length ? scope.warnings.join(' | ') : 'scope was not fully fetched';
      console.warn(`[${scope.canonicalName}] Skipping deletion safeguard: ${reason}`);
      continue;
    }

    const existing = await fetchExistingCarIdsForMake(scope.canonicalName);
    if (!existing.length) {
      makesProcessed += 1;
      continue;
    }

    const seen = new Set(scope.seenSourceIds.map(String));
    const missingIds = existing
      .filter((row) => !seen.has(String(row.source_id)))
      .map((row) => row.id);

    if (!missingIds.length) {
      makesProcessed += 1;
      continue;
    }

    for (const chunk of chunkArray(missingIds, DELETE_CHUNK_SIZE)) {
      await executeSupabase(
        getSupabase().from('cars').delete().in('id', chunk),
        'Delete disappeared cars'
      );
      deleted += chunk.length;
    }

    makesProcessed += 1;
    console.log(`[${scope.canonicalName}] Removed ${missingIds.length} disappeared listings.`);
  }

  return { deleted, makesProcessed, makesSkipped };
}

// -----------------------------------------------------------------------------
// Public entry points
// -----------------------------------------------------------------------------

// Encar's list endpoint silently returns Count=0 for any page size above
// 1000 — clamp here so a bad config doesn't make the scraper look "empty"
// when it's actually just over the API's per-page cap.
const ENCAR_MAX_PAGE_SIZE = 1000;

function createFetchOptions(options = {}) {
  const requestedPageSize = options.pageSize || PAGE_SIZE;
  return {
    carListPath: options.carListPath,
    targetAliases: options.targetAliases,
    pageSize: Math.min(requestedPageSize, ENCAR_MAX_PAGE_SIZE),
    maxListingsPerMake:
      parsePositiveInt(options.maxListingsPerMake) ||
      MAX_LISTINGS_PER_MAKE,
  };
}

/**
 * Fetch + normalize without writing. Useful for dry-runs / inspection.
 */
async function fetchCars(options = {}) {
  const fetchOptions = createFetchOptions(options);
  const startedAt = new Date().toISOString();
  const { targets, unknownAliases } = await loadTargetManufacturers(fetchOptions);
  const exchangeRate = await fetchExchangeRate();
  await bootstrapSession();
  const rows = [];
  const makes = [];

  if (unknownAliases.length) {
    console.warn(`Ignoring unsupported makes: ${unknownAliases.join(', ')}`);
  }

  for (const target of targets) {
    const result = await fetchManufacturerCars(target, {
      pageSize: fetchOptions.pageSize,
      maxListingsPerMake: fetchOptions.maxListingsPerMake,
      exchangeRate,
    });
    makes.push(result.meta);
    rows.push(...result.rows);
  }

  // Only throw if we genuinely got nothing back — partial dry-runs are fine.
  if (rows.length === 0 && makes.every((m) => !m.fetchSucceeded)) {
    for (const m of makes) {
      if (m.warnings?.length) {
        for (const w of m.warnings) console.warn(`[${m.canonicalName}] ${w}`);
      }
    }
    throw new Error('All make fetches failed and no rows were normalized.');
  }

  return {
    rows,
    sync: {
      startedAt,
      completedAt: new Date().toISOString(),
      exchangeRate,
      pageSize: fetchOptions.pageSize,
      maxListingsPerMake: fetchOptions.maxListingsPerMake,
      unknownAliases,
      makes,
    },
  };
}

// ---- sync_runs observability -----------------------------------------------

async function startSyncRun(targets, exchangeRate) {
  try {
    const { data, error } = await getSupabase()
      .from('sync_runs')
      .insert({
        targets: targets.map((t) => t.canonicalName),
        exchange_rate: exchangeRate,
        status: 'running',
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.warn(`Could not record sync_run start: ${error.message}`);
    return null;
  }
}

async function finishSyncRun(runId, status, summary, errorMessage = null) {
  if (runId == null) return;
  try {
    const { error } = await getSupabase()
      .from('sync_runs')
      .update({
        finished_at: new Date().toISOString(),
        status,
        fetched_listings: summary?.totals?.fetchedListings ?? 0,
        saved_rows: summary?.totals?.savedRows ?? 0,
        skipped_listings: summary?.totals?.skippedListings ?? 0,
        deleted_rows: summary?.totals?.deletedRows ?? 0,
        error: errorMessage,
        // Strip the heavy `seenSourceIds` array before writing — it can be
        // tens of thousands of strings per make.
        summary: summary
          ? {
              ...summary,
              makes: summary.makes?.map((m) => {
                const { seenSourceIds: _omit, ...rest } = m;
                return rest;
              }),
            }
          : null,
      })
      .eq('id', runId);
    if (error) throw error;
  } catch (error) {
    console.warn(`Could not record sync_run finish: ${error.message}`);
  }
}

/**
 * Fetch + normalize + write to Supabase + remove disappeared listings.
 * Logs the run to public.sync_runs (best-effort).
 */
async function syncCars(options = {}) {
  const fetchOptions = createFetchOptions(options);
  const startedAt = new Date().toISOString();
  const { targets, unknownAliases } = await loadTargetManufacturers(fetchOptions);
  const exchangeRate = await fetchExchangeRate();
  await bootstrapSession();
  const runId = await startSyncRun(targets, exchangeRate);

  const summary = {
    startedAt,
    completedAt: null,
    exchangeRate,
    pageSize: fetchOptions.pageSize,
    maxListingsPerMake: fetchOptions.maxListingsPerMake,
    unknownAliases,
    makes: [],
    totals: {
      fetchedListings: 0,
      normalizedRows: 0,
      skippedListings: 0,
      savedRows: 0,
      deletedRows: 0,
    },
  };

  if (unknownAliases.length) {
    console.warn(`Ignoring unsupported makes: ${unknownAliases.join(', ')}`);
  }

  try {
    for (const target of targets) {
      let savedThisMake = 0;
      const result = await fetchManufacturerCars(target, {
        pageSize: fetchOptions.pageSize,
        maxListingsPerMake: fetchOptions.maxListingsPerMake,
        exchangeRate,
        onRowsBatch: async (batch) => {
          const written = await upsertCarRows(batch);
          savedThisMake += written;
        },
      });

      summary.makes.push(result.meta);
      summary.totals.fetchedListings += result.meta.fetchedListings;
      summary.totals.normalizedRows += result.meta.normalizedRows;
      summary.totals.skippedListings += result.meta.skippedListings;
      summary.totals.savedRows += savedThisMake;
      summary.totals.freshSkipped =
        (summary.totals.freshSkipped || 0) + (result.meta.freshSkipped || 0);

      const summaryParts = [];
      if (savedThisMake > 0) summaryParts.push(`saved ${savedThisMake}`);
      if (result.meta.freshSkipped > 0) {
        summaryParts.push(`skipped ${result.meta.freshSkipped} fresh`);
      }
      console.log(
        summaryParts.length
          ? `[${target.canonicalName}] ${summaryParts.join(', ')}.`
          : `[${target.canonicalName}] No valid listings to save.`
      );
    }

    // Always surface per-make warnings so a partial run is still
    // diagnosable. These are visible in the console + persisted in
    // sync_runs.summary.
    for (const m of summary.makes) {
      if (m.warnings?.length) {
        for (const w of m.warnings) console.warn(`[${m.canonicalName}] ${w}`);
      }
    }

    const anySaved = summary.totals.savedRows > 0;
    const anyFailed = summary.makes.some((m) => !m.fetchSucceeded);
    const allFailed = summary.makes.every((m) => !m.fetchSucceeded);

    // Hard fail only if NOTHING was saved AND every make hit page errors.
    // Partial saves are common (transient timeouts mid-pagination) and
    // should not abort the run — we keep what we got and let the next
    // scheduled run fill in the rest. Deletion only runs when fully
    // successful so we never delete based on incomplete data.
    if (!anySaved && allFailed) {
      throw new Error(
        'All make fetches failed and no rows were saved. ' +
        'See per-make warnings above for the actual cause.'
      );
    }

    if (!anyFailed) {
      // Run deletion regardless of whether a per-make cap is set.
      // Per-make `deletionSafe` decides what to actually do for each
      // make; capped makes treat the fetched batch as authoritative
      // (rolling top-N), uncapped makes use the full Encar count.
      const del = await deleteMissingListings(summary.makes);
      summary.totals.deletedRows = del.deleted;
      summary.deletion = del;
    } else {
      summary.deletion = {
        skipped: true,
        reason:
          'Deletion safeguard: at least one make had pagination errors, so we ' +
          'cannot prove which listings disappeared. Will retry on next run.',
      };
    }

    summary.completedAt = new Date().toISOString();
    reportUnmappedFragments(console);

    const status = anyFailed ? 'partial' : 'success';
    await finishSyncRun(runId, status, summary);
    return summary;
  } catch (error) {
    summary.completedAt = new Date().toISOString();
    reportUnmappedFragments(console);
    // Surface per-make warnings before rethrowing so the operator can
    // see what actually went wrong.
    for (const m of summary.makes) {
      if (m.warnings?.length) {
        for (const w of m.warnings) console.warn(`[${m.canonicalName}] ${w}`);
      }
    }
    await finishSyncRun(runId, 'failed', summary, error.message);
    throw error;
  }
}

// -----------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------

if (require.main === module) {
  const cliAliases = process.argv.slice(2);

  syncCars({ targetAliases: cliAliases.length ? cliAliases : undefined })
    .then((summary) => {
      console.log('Encar scraper sync finished.');
      console.log(JSON.stringify({
        totals: summary.totals,
        makes: summary.makes.map((m) => ({
          make: m.canonicalName,
          fetchedListings: m.fetchedListings,
          normalizedRows: m.normalizedRows,
          skippedListings: m.skippedListings,
          deletionSafe: m.deletionSafe,
        })),
      }, null, 2));
    })
    .catch((error) => {
      console.error('Encar scraper sync failed:', error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  fetchCars,
  syncCars,
  loadTargetManufacturers,
  // Exposed for tests / one-off scripts.
  normalizeListing,
  normalizeFuelType,
  extractRegistration,
  buildImageUrls,
};
