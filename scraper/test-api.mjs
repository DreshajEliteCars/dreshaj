// Quick health check for the Encar search API. Hits one make, prints
// metadata + a sample listing. No deps, no Supabase, no writes.
//
//   node scraper/test-api.mjs            -> defaults to BMW
//   node scraper/test-api.mjs benz       -> Mercedes-Benz
//   node scraper/test-api.mjs porsche 5  -> Porsche, 5 listings

const ENCAR_SEARCH_URL = "https://api.encar.com/search/car/list/general";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Referer: "https://www.encar.com/",
  Origin: "https://www.encar.com",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

const TARGETS = {
  bmw: { name: "BMW", q: "BMW" },
  benz: { name: "Mercedes-Benz", q: "벤츠" },
  audi: { name: "Audi", q: "아우디" },
  porsche: { name: "Porsche", q: "포르쉐" },
  hyundai: { name: "Hyundai", q: "현대" },
  kia: { name: "Kia", q: "기아" },
  tesla: { name: "Tesla", q: "테슬라" },
  ferrari: { name: "Ferrari", q: "페라리" },
};

const aliasArg = (process.argv[2] || "bmw").toLowerCase();
const sampleCount = Math.max(1, Math.min(parseInt(process.argv[3] || "3", 10) || 3, 20));
const target = TARGETS[aliasArg];
if (!target) {
  console.error(`Unknown make alias: ${aliasArg}. Known: ${Object.keys(TARGETS).join(", ")}`);
  process.exit(2);
}

const query = `(And.Hidden.N._.CarType.A._.Manufacturer.${target.q}.)`;
const sr = `|ModifiedDate|0|${sampleCount}`;

const url =
  `${ENCAR_SEARCH_URL}?count=true` +
  `&q=${encodeURIComponent(query)}` +
  `&sr=${encodeURIComponent(sr)}`;

console.log(`→ Probing Encar API for "${target.name}" (${target.q})`);
console.log(`  URL: ${url}\n`);

const startedAt = Date.now();
let res;
try {
  res = await fetch(url, { headers: HEADERS });
} catch (err) {
  console.error("Network error:", err?.message || err);
  process.exit(1);
}
const elapsed = Date.now() - startedAt;

console.log(`← HTTP ${res.status} ${res.statusText} in ${elapsed}ms`);
console.log(`  content-type: ${res.headers.get("content-type")}`);

const bodyText = await res.text();
if (!res.ok) {
  console.error(`Request failed. First 500 chars of body:\n${bodyText.slice(0, 500)}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(bodyText);
} catch {
  console.error("Response was not valid JSON. First 500 chars:");
  console.error(bodyText.slice(0, 500));
  process.exit(1);
}

const results = Array.isArray(data.SearchResults) ? data.SearchResults : [];
console.log(`  reported total Count: ${data.Count}`);
console.log(`  returned in this page: ${results.length}\n`);

if (!results.length) {
  console.warn("No listings returned. Endpoint reachable but query yielded nothing.");
  process.exit(0);
}

console.log(`Sample (${Math.min(results.length, sampleCount)} listing${results.length > 1 ? "s" : ""}):`);
for (const item of results.slice(0, sampleCount)) {
  const sample = {
    Id: item.Id,
    Manufacturer: item.Manufacturer,
    Model: item.Model,
    Badge: item.Badge,
    Year: item.Year,
    FormYear: item.FormYear,
    Price_manwon: item.Price,
    Price_eur_estimate: item.Price ? Math.round(item.Price * 10000 * 0.00069 + 400) : null,
    Mileage_km: item.Mileage,
    FuelType: item.FuelType,
    Photo_first:
      Array.isArray(item.Photos) && item.Photos[0]?.location
        ? `https://ci.encar.com${item.Photos[0].location}`
        : item.Photo
        ? `https://ci.encar.com${item.Photo}001.jpg`
        : null,
  };
  console.log(JSON.stringify(sample, null, 2));
}

console.log("\nKeys present on first listing:");
console.log(Object.keys(results[0]).sort().join(", "));
