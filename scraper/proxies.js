/**
 * Parse and load HTTP/HTTPS proxies from env or scraper/proxy.txt.
 *
 * Supported line formats (one per line in proxy.txt; lines starting with
 * # or empty lines are ignored):
 *
 *   host:port
 *   host:port:user:pass
 *   user:pass@host:port
 *   http://user:pass@host:port
 *   http://host:port
 *   https://user:pass@host:port
 *
 * Plus the SCRAPER_PROXIES env var: comma- or newline-separated, same
 * format. SCRAPER_PROXY (singular) is also honoured.
 *
 * Returns an array of fully-formed URL strings (always with scheme),
 * suitable to feed straight into HttpsProxyAgent.
 */

const fs = require('fs/promises');
const path = require('path');

const DEFAULT_PROXY_FILE = path.join(__dirname, 'proxy.txt');

function normalizeProxy(line) {
  if (!line) return null;
  const trimmed = String(line).trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  // Already has scheme prefix.
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).toString();
    } catch {
      return null;
    }
  }

  // user:pass@host:port  →  http://user:pass@host:port
  if (trimmed.includes('@')) {
    try {
      return new URL(`http://${trimmed}`).toString();
    } catch {
      return null;
    }
  }

  // host:port:user:pass  (most common static-proxy provider format)
  // host:port
  const parts = trimmed.split(':');
  if (parts.length === 4) {
    const [host, port, user, pass] = parts;
    if (!host || !port) return null;
    try {
      return new URL(
        `http://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}`
      ).toString();
    } catch {
      return null;
    }
  }
  if (parts.length === 2) {
    const [host, port] = parts;
    if (!host || !port) return null;
    try {
      return new URL(`http://${host}:${port}`).toString();
    } catch {
      return null;
    }
  }

  return null;
}

async function loadProxies({ envValue, file = DEFAULT_PROXY_FILE } = {}) {
  const fromEnv = (envValue ?? process.env.SCRAPER_PROXIES ?? process.env.SCRAPER_PROXY ?? '')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (fromEnv.length) {
    return uniq(fromEnv.map(normalizeProxy).filter(Boolean));
  }

  try {
    const content = await fs.readFile(file, 'utf8');
    const lines = content.split(/\r?\n/);
    return uniq(lines.map(normalizeProxy).filter(Boolean));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function uniq(items) {
  return Array.from(new Set(items));
}

/** Mask credentials for safe logging. */
function describeProxy(proxyUrl) {
  try {
    const u = new URL(proxyUrl);
    return u.username ? `${u.hostname}:${u.port} (auth ${u.username[0]}***)` : `${u.hostname}:${u.port}`;
  } catch {
    return proxyUrl;
  }
}

module.exports = { loadProxies, normalizeProxy, describeProxy };
