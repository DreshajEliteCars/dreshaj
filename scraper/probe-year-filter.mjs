// Probes whether Encar's search API supports a year-range filter inside the
// q= DSL. Tries a few candidate shapes and prints the Count for each.
//
//   node scraper/probe-year-filter.mjs

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

async function probe(label, q) {
  const url =
    `${URL_BASE}?count=true&q=${encodeURIComponent(q)}` +
    `&sr=${encodeURIComponent("|ModifiedDate|0|1")}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.log(`  ${label.padEnd(60)}  HTTP ${res.status}`);
      return;
    }
    const data = await res.json();
    const count = Number(data.Count ?? "?");
    console.log(`  ${label.padEnd(60)}  Count = ${count.toLocaleString?.() ?? count}`);
  } catch (e) {
    console.log(`  ${label.padEnd(60)}  ERR ${e.message}`);
  }
}

console.log("Baseline (BMW, no year filter):");
await probe("Manufacturer.BMW", "(And.Hidden.N._.CarType.A._.Manufacturer.BMW.)");

console.log("\nCandidate year-range syntaxes:");

// 1) Year.range(yyyymm..yyyymm) — common in encar URLs
await probe(
  "Year.range(202001..202412)",
  "(And.Hidden.N._.CarType.A._.Manufacturer.BMW._.Year.range(202001..202412).)"
);

// 2) Year.range(yyyy..yyyy)
await probe(
  "Year.range(2020..2024)",
  "(And.Hidden.N._.CarType.A._.Manufacturer.BMW._.Year.range(2020..2024).)"
);

// 3) FormYear.range
await probe(
  "FormYear.range(2020..2024)",
  "(And.Hidden.N._.CarType.A._.Manufacturer.BMW._.FormYear.range(2020..2024).)"
);

// 4) Year as range with single value (sanity check)
await probe(
  "Year.range(202301..202312)",
  "(And.Hidden.N._.CarType.A._.Manufacturer.BMW._.Year.range(202301..202312).)"
);

// 5) Modified-date based as alternate slicer
await probe(
  "ModifiedDate.range(20240101..20241231)",
  "(And.Hidden.N._.CarType.A._.Manufacturer.BMW._.ModifiedDate.range(20240101..20241231).)"
);

// 6) Price.range as another candidate (cross-check DSL)
await probe(
  "Price.range(0..2000) [manwon]",
  "(And.Hidden.N._.CarType.A._.Manufacturer.BMW._.Price.range(0..2000).)"
);
