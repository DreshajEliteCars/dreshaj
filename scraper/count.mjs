// Counts how many listings Encar reports for each make in TARGET_MAKES.
// Read-only. No DB writes.
//
//   node scraper/count.mjs

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

// Same list as scraper/scraper.js TARGET_MAKES.
const TARGETS = [
  ["Mercedes-Benz", "벤츠"],
  ["BMW", "BMW"],
  ["Kia", "기아"],
  ["Audi", "아우디"],
  ["Jeep", "지프"],
  ["Mazda", "마쯔다"],
  ["Nissan", "닛산"],
  ["Peugeot", "푸조"],
  ["Renault Korea", "르노코리아(삼성)"],
  ["Volvo", "볼보"],
  ["Suzuki", "스즈키"],
  ["Tesla", "테슬라"],
  ["Smart", "스마트"],
  ["Porsche", "포르쉐"],
  ["Lexus", "렉서스"],
  ["Jaguar", "재규어"],
  ["Hyundai", "현대"],
  ["Honda", "혼다"],
  ["Ford", "포드"],
  ["Fiat", "피아트"],
  ["Toyota", "도요타"],
  ["BYD", "BYD"],
  ["Aston Martin", "애스턴마틴"],
  ["Ferrari", "페라리"],
];

// Match the scraper's actual production query: retail only, deduplicated,
// and within Kosovo's 10-year-import window.
const MIN_YEAR = new Date().getFullYear() - 11;
const MAX_YEAR = new Date().getFullYear() + 1;
const YEAR_RANGE = `Year.range(${MIN_YEAR * 100 + 1}..${MAX_YEAR * 100 + 12})`;

async function countOne(name, k) {
  const q = `(And.Hidden.N._.CarType.A._.Manufacturer.${k}._.ServiceCopyCar.ORIGINAL._.SellType.일반._.${YEAR_RANGE}.)`;
  const sr = `|ModifiedDate|0|1`;
  const url =
    `${ENCAR_SEARCH_URL}?count=true` +
    `&q=${encodeURIComponent(q)}` +
    `&sr=${encodeURIComponent(sr)}`;

  const t0 = Date.now();
  const res = await fetch(url, { headers: HEADERS });
  const ms = Date.now() - t0;
  if (!res.ok) {
    return { name, k, count: null, ms, error: `HTTP ${res.status}` };
  }
  const data = await res.json();
  return { name, k, count: Number(data.Count) || 0, ms, error: null };
}

console.log(`Counting ${TARGETS.length} makes against Encar (sequential, ~400ms each)…\n`);

const rows = [];
let total = 0;
let totalMs = 0;
for (const [name, k] of TARGETS) {
  const r = await countOne(name, k);
  rows.push(r);
  totalMs += r.ms;
  if (r.count != null) total += r.count;
  const status = r.error ? `ERR ${r.error}` : `${r.count.toLocaleString()}`;
  console.log(`  ${name.padEnd(18)}  ${status.padStart(12)}  (${r.ms}ms)`);
}

console.log(
  `\nTotal: ${total.toLocaleString()} listings across ${TARGETS.length} makes ` +
    `(elapsed ${totalMs}ms)`
);

// Effective scrapable estimate: Encar's API caps at ~10k unique results per
// query, so any make above 10k will be partially covered unless we slice.
const scrapable = rows.reduce((a, r) => a + Math.min(r.count ?? 0, 10000), 0);
const partial = rows.filter((r) => (r.count ?? 0) > 10000);

console.log(
  `Practically scrapable in one pass (10k cap per make): ` +
    `~${scrapable.toLocaleString()} listings`
);
if (partial.length) {
  console.log(`Makes that exceed the 10k cap (need slicing):`);
  for (const r of partial) {
    console.log(`  - ${r.name}: ${r.count.toLocaleString()}`);
  }
}

// Crude storage estimate: ~3 KB per row (jsonb raw + text fields).
const bytesPerRow = 3 * 1024;
const mb = (n) => (n * bytesPerRow) / (1024 * 1024);
console.log(
  `\nStorage estimate (~${bytesPerRow} bytes/row incl. raw jsonb):`
);
console.log(`  Full set:   ~${mb(total).toFixed(0)} MB`);
console.log(`  Scrapable:  ~${mb(scrapable).toFixed(0)} MB`);
