// Find the Encar endpoint that returns the FULL photo gallery for one
// listing (the search/list endpoint only returns ~4 sample photos).
//
//   node scraper/probe-detail.mjs 41422652

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Referer: 'https://fem.encar.com/',
  Origin: 'https://fem.encar.com',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

const ID = process.argv[2] || '41422652';

const candidates = [
  // /v1/readside/* family — confirmed working namespace
  `https://api.encar.com/v1/readside/vehicle/${ID}`,
  `https://api.encar.com/v1/readside/vehicles/${ID}`,
  `https://api.encar.com/v1/readside/photo/vehicle/${ID}`,
  `https://api.encar.com/v1/readside/photos/vehicle/${ID}`,
  `https://api.encar.com/v1/readside/picture/vehicle/${ID}`,
  `https://api.encar.com/v1/readside/pictures/vehicle/${ID}`,
  `https://api.encar.com/v1/readside/image/vehicle/${ID}`,
  `https://api.encar.com/v1/readside/images/vehicle/${ID}`,
  `https://api.encar.com/v1/readside/gallery/vehicle/${ID}`,
  `https://api.encar.com/v1/readside/spec/vehicle/${ID}`,
  `https://api.encar.com/v1/readside/option/vehicle/${ID}`,
  `https://api.encar.com/v1/readside/detail/vehicle/${ID}`,

  // Alternate roots
  `https://api.encar.com/v1/cars/${ID}`,
  `https://api.encar.com/v1/cars/${ID}/photos`,
  `https://api.encar.com/v1/cars/${ID}/images`,
];

for (const url of candidates) {
  process.stdout.write(`${url.padEnd(70)} `);
  try {
    const t = Date.now();
    const res = await fetch(url, { headers: HEADERS, redirect: 'manual' });
    const ms = Date.now() - t;
    const ct = res.headers.get('content-type') || '';
    let extra = '';
    if (res.ok && /json/.test(ct)) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        const stringified = JSON.stringify(data);
        const jpgRefs = (stringified.match(/\.jpg/gi) || []).length;
        const photoFields = (stringified.match(/"photo[^"]*":/gi) || []).length;
        const photosFields = (stringified.match(/"photos[^"]*":/gi) || []).length;
        const imageFields = (stringified.match(/"image[^"]*":/gi) || []).length;
        extra =
          ` keys=[${Object.keys(data).slice(0, 8).join(',')}]` +
          ` jpgRefs=${jpgRefs}` +
          ` photoFields=${photoFields + photosFields + imageFields}`;
      } catch {
        extra = ` (non-JSON body)`;
      }
    }
    console.log(`HTTP ${res.status} ${ms}ms ${ct}${extra}`);
  } catch (e) {
    console.log(`ERR ${e.message}`);
  }
}
