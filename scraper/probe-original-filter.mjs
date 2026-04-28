// Probe whether Encar's DSL accepts a ServiceCopyCar filter so we can
// keep only ORIGINAL listings (skipping the 40-50% DUPLICATION rate).
//
//   node scraper/probe-original-filter.mjs

const URL_BASE = 'https://api.encar.com/search/car/list/general';
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Referer: 'https://www.encar.com/',
  Origin: 'https://www.encar.com',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function probe(label, q) {
  const url =
    `${URL_BASE}?count=true&q=${encodeURIComponent(q)}` +
    `&sr=${encodeURIComponent('|ModifiedDate|0|1')}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.log(`  ${label.padEnd(60)}  HTTP ${res.status}`);
      return;
    }
    const data = await res.json();
    const count = Number(data.Count ?? 0);
    console.log(`  ${label.padEnd(60)}  Count = ${count.toLocaleString()}`);
  } catch (e) {
    console.log(`  ${label.padEnd(60)}  ERR ${e.message}`);
  }
}

console.log('Baseline (all BMW):');
await probe('Manufacturer.BMW', '(And.Hidden.N._.CarType.A._.Manufacturer.BMW.)');

console.log('\nServiceCopyCar candidates:');
await probe(
  'ServiceCopyCar.ORIGINAL',
  '(And.Hidden.N._.CarType.A._.Manufacturer.BMW._.ServiceCopyCar.ORIGINAL.)'
);
await probe(
  'ServiceCopyCar.O',
  '(And.Hidden.N._.CarType.A._.Manufacturer.BMW._.ServiceCopyCar.O.)'
);
await probe(
  'CopyCar.ORIGINAL',
  '(And.Hidden.N._.CarType.A._.Manufacturer.BMW._.CopyCar.ORIGINAL.)'
);
await probe(
  'Copy.ORIGINAL',
  '(And.Hidden.N._.CarType.A._.Manufacturer.BMW._.Copy.ORIGINAL.)'
);
await probe(
  'Copy.O (no _ before sub)',
  '(And.Hidden.N._.CarType.A._.Manufacturer.BMW.Copy.O.)'
);

// Encar's web UI uses these patterns — try the encar-style "Trust" filter
console.log('\nTrust / certified filters (from encar.com URLs):');
await probe(
  'Trust.HomeService',
  '(And.Hidden.N._.CarType.A._.Manufacturer.BMW._.Trust.HomeService.)'
);
await probe(
  'ServiceMark.EncarDiagnosisP1',
  '(And.Hidden.N._.CarType.A._.Manufacturer.BMW._.ServiceMark.EncarDiagnosisP1.)'
);
await probe(
  'ServiceMark.EncarDiagnosis',
  '(And.Hidden.N._.CarType.A._.Manufacturer.BMW._.ServiceMark.EncarDiagnosis.)'
);

// SellType / BuyType variants
console.log('\nSellType / BuyType filters:');
await probe(
  'SellType.일반',
  '(And.Hidden.N._.CarType.A._.Manufacturer.BMW._.SellType.일반.)'
);
await probe(
  'BuyType.Visit',
  '(And.Hidden.N._.CarType.A._.Manufacturer.BMW._.BuyType.Visit.)'
);

// What about excluding 경매 (auction)?
console.log('\nExclusion patterns:');
await probe(
  'Not Auction (try)',
  '(And.Hidden.N._.CarType.A._.Manufacturer.BMW._.(Not.SellType.경매.).)'
);
