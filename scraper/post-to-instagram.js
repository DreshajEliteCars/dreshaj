/**
 * Supabase `cars` rows → Instagram posts.
 *
 * The scraper (scraper.js) can drop thousands of rows into `cars` in a
 * single sync. This job runs separately (its own, much less frequent
 * schedule — see .github/workflows/instagram-post.yml) and only ever
 * posts a small, capped batch of *unposted* listings per run, tracked via
 * the `ig_posted_at` column (supabase/migrations/0007_add_ig_posted_at.sql).
 * A car is only ever posted once — once `ig_posted_at` is set it's
 * excluded from future runs.
 *
 * Batch mode is also idempotent per UTC day (hasPostedToday()): if
 * anything already posted today, later runs skip instead of posting a
 * second batch. This is what lets the GitHub Actions schedule fire
 * several times across a window as a safety net against a dropped or
 * delayed cron tick, rather than depending on exactly one tick landing.
 *
 * Single photo  -> one `/media` call, image_url + caption, straight to publish.
 * Multiple photos -> carousel: each image becomes a child container
 * (`is_carousel_item=true`), then a parent CAROUSEL container references
 * all children, then that parent gets published. Capped at 10 images —
 * that's Instagram's hard limit per carousel.
 *
 * Pricing: `cars.price_eur` is the raw Encar price. The site never shows
 * that number directly — every displayed price is `price_eur + ship_price_eur`,
 * where `ship_price_eur` is the single admin-configurable surcharge in
 * `app_settings` (src/lib/appSettings.ts `applyShipPrice`). This job reads
 * that same settings row so the posted price always matches the site.
 *
 * Required environment variables:
 *   SUPABASE_URL        - project URL (same var the scraper uses)
 *   SUPABASE_KEY         - service-role key (same var the scraper uses)
 *   IG_ACCESS_TOKEN      - long-lived Instagram user access token (from Instagram Login,
 *                          graph.instagram.com) with instagram_business_content_publish
 *   IG_BUSINESS_ID       - Instagram Business Account ID (same value returned as the
 *                          user id when the token was generated)
 *
 * Optional:
 *   IG_POSTS_PER_RUN        - how many unposted cars to publish this run, default 5
 *   IG_CONTACT_PHONE        - default "+37744202673"
 *   IG_SITE_URL              - default "dreshajelitecars.com"
 *   IG_DRY_RUN                - "true" to build + print payloads without calling the API
 *                              or writing ig_posted_at
 *   IG_MAX_CAROUSEL_IMAGES   - default 10 (Instagram's own cap)
 *   IG_POST_STEP_DELAY_MS    - pause between posts within a run, default 60000 (1 min)
 *
 * CLI:
 *   node scraper/post-to-instagram.js                    # posts up to IG_POSTS_PER_RUN unposted cars
 *   node scraper/post-to-instagram.js <car-id>            # posts one specific car, ignoring the cap/flag
 *   IG_DRY_RUN=true node scraper/post-to-instagram.js     # print payloads only, no API calls, no DB writes
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.instagram.com/${GRAPH_API_VERSION}`;

const IG_CONTACT_PHONE = process.env.IG_CONTACT_PHONE || '+37744202673';
const IG_SITE_URL = process.env.IG_SITE_URL || 'dreshajelitecars.com';
const IG_DRY_RUN = String(process.env.IG_DRY_RUN).toLowerCase() === 'true';
const MAX_CAROUSEL_IMAGES = parsePositiveInt(process.env.IG_MAX_CAROUSEL_IMAGES) || 10;
const POSTS_PER_RUN = parsePositiveInt(process.env.IG_POSTS_PER_RUN) || 5;

// One post per brand per run, in this order — five brands, five posts a
// day. `make` values must match `cars.make` exactly (see the scraper's
// carlist.txt / Encar manufacturer naming), e.g. "Mercedes-Benz" not
// "Benz", "Volkswagen" not "VW". Override via IG_TARGET_BRANDS
// (comma-separated) without touching code.
const DEFAULT_TARGET_BRANDS = ['BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Renault'];
const TARGET_BRANDS = process.env.IG_TARGET_BRANDS
  ? process.env.IG_TARGET_BRANDS.split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_TARGET_BRANDS;

// Mirrors src/lib/appSettings.ts DEFAULT_SHIP_PRICE_EUR — only used if the
// app_settings row can't be read for some reason, so a DB hiccup doesn't
// crash the whole run.
const FALLBACK_SHIP_PRICE_EUR = 1300;

// Between child-container creations in a carousel, so we don't slam the
// endpoint with 10 back-to-back writes. Not required for correctness, just
// polite — mirrors the spacing the main scraper uses against Encar.
const CAROUSEL_STEP_DELAY_MS = 800;

// Between separate posts within one run — spreads a 5-post run out over a
// few minutes instead of firing them back-to-back, which reads as more
// natural activity and stays well clear of IG's own rate limits.
const POST_STEP_DELAY_MS = parsePositiveInt(process.env.IG_POST_STEP_DELAY_MS) || 60_000;

function parsePositiveInt(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -----------------------------------------------------------------------------
// Caption
// -----------------------------------------------------------------------------

/** Same math as src/lib/appSettings.ts applyShipPrice — raw price + surcharge. */
function applyShipPrice(rawPriceEur, shipPriceEur) {
  return rawPriceEur == null ? null : rawPriceEur + shipPriceEur;
}

function buildCaption(car, shipPriceEur) {
  const title = [car.make, car.model, car.trim].filter(Boolean).join(' ');
  const registration = String(car.registration_year);
  const km = car.mileage_km != null ? `${car.mileage_km.toLocaleString('en-US')} km` : 'N/A';
  const displayPriceEur = applyShipPrice(car.price_eur, shipPriceEur);
  const price = displayPriceEur != null ? `${displayPriceEur.toLocaleString('en-US')}€` : 'Kontaktoni për çmim';

  return `🚗 ${title}

✨ Dreshaj Elite Cars ✨

💶 Çmimi deri në Durrës: ${price} (pa doganë)
📍 Deri në Kosovë: +350€

📅 Viti: ${registration}
🛣️ Kilometrazha: ${km}
⚙️ Transmisioni: ${car.transmission || 'N/A'}
⛽ Karburanti: ${car.fuel_type || 'N/A'}

📞 Kontakt: ${IG_CONTACT_PHONE} (Viber / WhatsApp)
🌐 ${IG_SITE_URL}`;
}

// -----------------------------------------------------------------------------
// Supabase
// -----------------------------------------------------------------------------

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_KEY environment variables.');
  }
  return createClient(url, key);
}

async function fetchCarById(supabase, carId) {
  const { data, error } = await supabase.from('cars').select('*').eq('id', carId).single();
  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }
  if (!data) {
    throw new Error(`No car found with id "${carId}".`);
  }
  return data;
}

/**
 * One unposted, Diesel-only car per brand, in TARGET_BRANDS order —
 * freshest listing for each. Keeps the feed varied instead of e.g. 5
 * BMWs in a row when BMW happens to have the most recent inventory.
 * `fuel_type` is normalized by the scraper to exactly "Diesel"
 * (scraper/scraper.js normalizeFuelType) — Petrol/Hibrid/Elektrik/LPG
 * listings are excluded. A brand with no unposted Diesel stock right
 * now is simply skipped for this run (not an error — it'll catch up
 * whenever new stock lands).
 */
async function fetchUnpostedCarsByBrand(supabase, brands) {
  const picks = [];
  for (const make of brands) {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .is('ig_posted_at', null)
      .eq('make', make)
      .eq('fuel_type', 'Diesel')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Supabase query failed for make "${make}": ${error.message}`);
    }
    if (data && data.length) {
      picks.push(data[0]);
    } else {
      console.log(`No unposted Diesel "${make}" inventory right now — skipping this run.`);
    }
  }
  return picks;
}

/** Same singleton row src/app/api/settings/route.ts reads (`app_settings`, id=1). */
async function fetchShipPriceEur(supabase) {
  const { data, error } = await supabase.from('app_settings').select('ship_price_eur').eq('id', 1).single();
  if (error || data?.ship_price_eur == null) {
    console.error(
      `Warning: couldn't read app_settings.ship_price_eur (${error?.message || 'no row'}) — falling back to ${FALLBACK_SHIP_PRICE_EUR}.`
    );
    return FALLBACK_SHIP_PRICE_EUR;
  }
  return data.ship_price_eur;
}

/**
 * True if any car was already marked posted today (UTC calendar day).
 * Lets the GitHub Actions schedule fire several times across a window
 * instead of depending on one specific cron tick landing — GitHub's own
 * docs acknowledge scheduled workflows "may not run" some days under
 * load, with no guarantee. Checking more often only helps if a second
 * check within the same day is a safe no-op instead of a second batch
 * of posts, which is what this guards.
 */
async function hasPostedToday(supabase) {
  const startOfDayUtc = new Date();
  startOfDayUtc.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('cars')
    .select('id', { count: 'exact', head: true })
    .gte('ig_posted_at', startOfDayUtc.toISOString());

  if (error) {
    console.error(`Warning: couldn't check today's post count (${error.message}) — proceeding as if not yet posted.`);
    return false;
  }
  return (count ?? 0) > 0;
}

async function markPosted(supabase, carId) {
  const { error } = await supabase.from('cars').update({ ig_posted_at: new Date().toISOString() }).eq('id', carId);
  if (error) {
    // Don't crash the run over this — the post already went out. Surface it
    // loudly instead, since a failed write here means this car could get
    // re-posted next run.
    console.error(`Warning: post succeeded but failed to mark "${carId}" as posted: ${error.message}`);
  }
}

// -----------------------------------------------------------------------------
// Instagram Graph API
// -----------------------------------------------------------------------------

function getIgConfig() {
  const accessToken = process.env.IG_ACCESS_TOKEN;
  const igBusinessId = process.env.IG_BUSINESS_ID;
  if (!accessToken || !igBusinessId) {
    throw new Error('Missing IG_ACCESS_TOKEN / IG_BUSINESS_ID environment variables.');
  }
  return { accessToken, igBusinessId };
}

async function createContainer(igBusinessId, accessToken, params) {
  const { data } = await axios.post(`${GRAPH_API_BASE}/${igBusinessId}/media`, null, {
    params: { ...params, access_token: accessToken },
  });
  return data.id;
}

async function publishContainer(igBusinessId, accessToken, creationId) {
  const { data } = await axios.post(`${GRAPH_API_BASE}/${igBusinessId}/media_publish`, null, {
    params: { creation_id: creationId, access_token: accessToken },
  });
  return data.id;
}

// Container creation returns immediately, but Instagram processes the
// media (esp. multi-image carousels) asynchronously — publishing before
// status_code is FINISHED fails with "Media ID is not available"
// (code 9007 / subcode 2207027). Poll until it's ready instead of
// publishing blind.
const CONTAINER_POLL_INTERVAL_MS = 3000;
const CONTAINER_POLL_MAX_ATTEMPTS = 20; // ~1 minute worst case

async function waitForContainerReady(accessToken, creationId) {
  for (let attempt = 1; attempt <= CONTAINER_POLL_MAX_ATTEMPTS; attempt += 1) {
    const { data } = await axios.get(`${GRAPH_API_BASE}/${creationId}`, {
      params: { fields: 'status_code', access_token: accessToken },
    });

    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') {
      throw new Error(`Container "${creationId}" failed processing (status_code=ERROR).`);
    }
    // IN_PROGRESS / EXPIRED / PUBLISHED all fall through to another poll,
    // except EXPIRED which we bail out on immediately below.
    if (data.status_code === 'EXPIRED') {
      throw new Error(`Container "${creationId}" expired before it could be published.`);
    }

    await sleep(CONTAINER_POLL_INTERVAL_MS);
  }

  throw new Error(`Container "${creationId}" never reached FINISHED after ${CONTAINER_POLL_MAX_ATTEMPTS} polls.`);
}

async function postSingleImage({ igBusinessId, accessToken, imageUrl, caption }) {
  const creationId = await createContainer(igBusinessId, accessToken, {
    image_url: imageUrl,
    caption,
  });
  await waitForContainerReady(accessToken, creationId);
  return publishContainer(igBusinessId, accessToken, creationId);
}

async function postCarousel({ igBusinessId, accessToken, imageUrls, caption }) {
  const childIds = [];
  for (const imageUrl of imageUrls) {
    const childId = await createContainer(igBusinessId, accessToken, {
      image_url: imageUrl,
      is_carousel_item: true,
    });
    childIds.push(childId);
    await sleep(CAROUSEL_STEP_DELAY_MS);
  }

  const parentId = await createContainer(igBusinessId, accessToken, {
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption,
  });

  await waitForContainerReady(accessToken, parentId);
  return publishContainer(igBusinessId, accessToken, parentId);
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function postOneCar(car, shipPriceEur, { igBusinessId, accessToken }) {
  const images = (car.images && car.images.length ? car.images : [car.image_url].filter(Boolean)).slice(
    0,
    MAX_CAROUSEL_IMAGES
  );

  if (images.length === 0) {
    throw new Error(`Car "${car.id}" has no images — nothing to post.`);
  }

  const caption = buildCaption(car, shipPriceEur);

  console.log(`Car: ${car.make} ${car.model} (${car.id})`);
  console.log(`Images: ${images.length}${car.images?.length > MAX_CAROUSEL_IMAGES ? ` (capped from ${car.images.length})` : ''}`);
  console.log('--- caption ---');
  console.log(caption);
  console.log('---------------');

  if (IG_DRY_RUN) {
    console.log('IG_DRY_RUN=true — not calling the Instagram API or writing ig_posted_at.');
    return null;
  }

  const postId =
    images.length === 1
      ? await postSingleImage({ igBusinessId, accessToken, imageUrl: images[0], caption })
      : await postCarousel({ igBusinessId, accessToken, imageUrls: images, caption });

  console.log(`Published. Instagram media id: ${postId}`);
  return postId;
}

async function main() {
  const carId = process.argv[2];
  const supabase = getSupabaseClient();
  const igConfig = IG_DRY_RUN ? { accessToken: null, igBusinessId: null } : getIgConfig();
  const shipPriceEur = await fetchShipPriceEur(supabase);

  // Single-car mode: post exactly this one, regardless of ig_posted_at.
  // Useful for manual testing without disturbing the daily batch state.
  if (carId) {
    const car = await fetchCarById(supabase, carId);
    await postOneCar(car, shipPriceEur, igConfig);
    return;
  }

  // Batch mode is idempotent per UTC day: if today's batch already went
  // out (via an earlier tick of the same schedule, or a manual run),
  // skip rather than post a second batch. This is what makes it safe for
  // the GitHub Actions schedule to fire more than once a day as a safety
  // net against a dropped/delayed cron tick — see hasPostedToday().
  if (!IG_DRY_RUN && (await hasPostedToday(supabase))) {
    console.log('Already posted today — skipping this run.');
    return;
  }

  // Batch mode: one unposted car per brand in TARGET_BRANDS, capped at
  // POSTS_PER_RUN (so adding a 6th brand later doesn't silently blow past
  // the daily cap).
  const cars = (await fetchUnpostedCarsByBrand(supabase, TARGET_BRANDS)).slice(0, POSTS_PER_RUN);

  if (cars.length === 0) {
    console.log('No unposted cars found for any target brand — nothing to do.');
    return;
  }

  console.log(
    `Posting ${cars.length} car(s) this run — brands: ${TARGET_BRANDS.join(', ')} (cap: ${POSTS_PER_RUN}). Ship price: ${shipPriceEur}€.`
  );

  for (const [index, car] of cars.entries()) {
    try {
      const postId = await postOneCar(car, shipPriceEur, igConfig);
      if (postId && !IG_DRY_RUN) {
        await markPosted(supabase, car.id);
      }
    } catch (err) {
      // One bad listing (dead image URL, etc.) shouldn't kill the rest of
      // the run — log it and move on to the next car.
      const apiError = err.response?.data?.error;
      console.error(`Skipping car "${car.id}":`, apiError ? JSON.stringify(apiError) : err.message);
    }

    const isLast = index === cars.length - 1;
    if (!isLast && !IG_DRY_RUN) {
      await sleep(POST_STEP_DELAY_MS);
    }
  }
}

main().catch((err) => {
  const apiError = err.response?.data?.error;
  console.error('Failed:', apiError ? JSON.stringify(apiError, null, 2) : err.message);
  process.exit(1);
});
