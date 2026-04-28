// Probe Encar listings to see what SellType / BuyType / ServiceMark
// values exist, and what their typical price distributions look like.
// Helps us decide what to filter out at scrape time.
//
//   node scraper/probe-sell-types.mjs

const URL_BASE = "https://api.encar.com/search/car/list/general";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Referer: "https://www.encar.com/",
  Origin: "https://www.encar.com",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

async function fetchSample(qSuffix, limit = 500) {
  const parts = ['Hidden.N', 'CarType.A'];
  if (qSuffix) parts.push(qSuffix);
  const q = `(And.${parts.join('._.')}.)`;
  const url =
    `${URL_BASE}?count=true` +
    `&q=${encodeURIComponent(q)}` +
    `&sr=${encodeURIComponent(`|ModifiedDate|0|${limit}`)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

console.log("=== Field distributions across 500-listing sample (mixed makes) ===\n");

const data = await fetchSample("", 500);
console.log(`Total reported across all makes: ${data.Count.toLocaleString()}`);
console.log(`Sampled in this page: ${data.SearchResults.length}\n`);

const tally = (key) => {
  const counts = new Map();
  const priceBy = new Map(); // value -> [prices...]
  for (const item of data.SearchResults) {
    const v = item[key] ?? "(none)";
    counts.set(v, (counts.get(v) || 0) + 1);
    if (!priceBy.has(v)) priceBy.set(v, []);
    if (item.Price > 0) priceBy.get(v).push(item.Price);
  }
  console.log(`-- ${key} --`);
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  for (const [v, n] of sorted) {
    const prices = priceBy.get(v) ?? [];
    const med = prices.length ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : null;
    console.log(
      `  ${String(v).padEnd(30)}  ${String(n).padStart(4)}` +
        (med != null ? `   median: ${med.toLocaleString()} 만원 (≈€${Math.round(med * 10000 * 0.00058).toLocaleString()})` : "")
    );
  }
  console.log();
};

tally("SellType");
tally("BuyType");
tally("ServiceMark");
tally("Condition");
tally("Trust");
tally("Separation");
tally("ServiceCopyCar");

// Look at the cheapest 10 listings to see what they actually are
console.log("=== Cheapest 10 listings in this sample (the suspicious ones) ===\n");
const cheap = [...data.SearchResults]
  .filter((i) => i.Price > 0)
  .sort((a, b) => a.Price - b.Price)
  .slice(0, 10);
for (const i of cheap) {
  console.log({
    Id: i.Id,
    Manufacturer: i.Manufacturer,
    Model: i.Model,
    Year: i.FormYear,
    Mileage: i.Mileage,
    Price_manwon: i.Price,
    Price_eur_estimate: Math.round(i.Price * 10000 * 0.00058 + 400),
    SellType: i.SellType,
    BuyType: i.BuyType,
    ServiceMark: i.ServiceMark,
    Condition: i.Condition,
    Separation: i.Separation,
  });
}

// And the most expensive — should clearly be retail
console.log("\n=== Most expensive 5 in this sample ===\n");
const expensive = [...data.SearchResults]
  .filter((i) => i.Price > 0)
  .sort((a, b) => b.Price - a.Price)
  .slice(0, 5);
for (const i of expensive) {
  console.log({
    Manufacturer: i.Manufacturer,
    Model: i.Model,
    Price_manwon: i.Price,
    SellType: i.SellType,
    BuyType: i.BuyType,
    ServiceMark: i.ServiceMark,
  });
}
