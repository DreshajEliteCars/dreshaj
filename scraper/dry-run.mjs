// End-to-end dry-run for the Encar scraper:
//   - hits the live API
//   - runs the same normalization the production scraper uses
//   - prints what would be inserted into Supabase, but does NOT write anything.
//
//   node scraper/dry-run.mjs                    -> BMW, 5 listings
//   node scraper/dry-run.mjs benz 3
//   node scraper/dry-run.mjs porsche 10

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// We avoid Supabase env vars by stubbing them before the scraper module loads.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || "stub-anon-key";

const {
  loadTargetManufacturers,
  fetchCars,
} = require("./scraper.js");

const aliasArg = (process.argv[2] || "bmw").toLowerCase();
const limit = Math.max(1, parseInt(process.argv[3] || "5", 10) || 5);

console.log(`→ Dry-running scraper for "${aliasArg}", limit=${limit}\n`);

try {
  // Confirm the alias resolves before doing anything else.
  await loadTargetManufacturers({ targetAliases: [aliasArg] });
} catch (err) {
  console.error(`Could not resolve alias "${aliasArg}":`, err.message);
  process.exit(2);
}

// Don't override pageSize — let the scraper use its default (500) so we
// don't trip Encar's per-page cap. The `limit` only controls the total
// number of listings via maxListingsPerMake.
const result = await fetchCars({
  targetAliases: [aliasArg],
  maxListingsPerMake: limit,
});

const make = result.sync.makes[0];
console.log("Sync metadata:");
console.log({
  make: make.canonicalName,
  initialCount: make.initialCount,
  finalCount: make.finalCount,
  fetched: make.fetchedListings,
  normalized: make.normalizedRows,
  skipped: make.skippedListings,
  priceBelowFloor: make.priceBelowFloor,
  fetchSucceeded: make.fetchSucceeded,
  exchangeRate: result.sync.exchangeRate,
  warnings: make.warnings,
});

// Quick price-distribution sanity check
const priced = result.rows.filter((r) => r.price_eur != null);
const unpriced = result.rows.length - priced.length;
const sortedPrices = priced.map((r) => r.price_eur).sort((a, b) => a - b);
const min = sortedPrices[0];
const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
const max = sortedPrices[sortedPrices.length - 1];
console.log(
  `Price distribution: min €${min}, median €${median}, max €${max}, ` +
    `${unpriced}/${result.rows.length} have null price (Kontakto për çmimin)`
);

console.log(`\nNormalized rows (${result.rows.length}):`);
for (const row of result.rows.slice(0, limit)) {
  // Don't dump `raw` (huge); print everything else.
  const { raw, ...rest } = row;
  console.log(JSON.stringify(rest, null, 2));
}

console.log("\n(no Supabase writes performed)");
