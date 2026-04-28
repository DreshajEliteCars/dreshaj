// Sanity check: known Korean strings should produce 100% Latin output.
//
//   node scraper/test-translations.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { translate, translateRegion, reportUnmappedFragments } = require('./translations');
const { containsHangul } = require('./hangul');

const cases = [
  // The user's specific complaints
  ['Porsche 마칸', 'Porsche Macan'],
  ['파나메라 (971)', 'Panamera (971)'],
  ['4.0 GTS', '4.0 GTS'],

  // BMW
  ['5시리즈 (G30)', '5 Series (G30)'],
  ['520i 럭셔리', '520i Luxury'],
  ['520d xDrive M 스포츠 플러스', '520d xDrive M Sport Plus'],
  ['그란 투리스모 (G32)', 'Gran Turismo (G32)'],
  ['X3 (F25)', 'X3 (F25)'],
  ['xDrive 20d', 'xDrive 20d'],

  // Mercedes
  ['A-클래스 W177', 'A-Class W177'],
  ['A220 4매틱 세단', 'A220 4Matic Sedan'],
  ['S-클래스', 'S-Class'],

  // Hyundai / Kia
  ['그랜저 (IG)', 'Grandeur (IG)'],
  ['아반떼 CN7', 'Avante CN7'],
  ['쏘렌토 MQ4', 'Sorento MQ4'],
  ['카니발 KA4', 'Carnival KA4'],

  // Audi
  ['A6 콰트로', 'A6 Quattro'],
  ['A4 아반트', 'A4 Avant'],

  // Edge cases
  ['', ''],
  [null, null],
];

let pass = 0;
let fail = 0;

console.log('translate() check:\n');
for (const [input, expected] of cases) {
  const got = translate(input);
  const ok = got === expected;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${JSON.stringify(input)} → ${JSON.stringify(got)}` +
    (ok ? '' : `   (expected ${JSON.stringify(expected)})`));
  if (ok) pass += 1;
  else fail += 1;
}

console.log('\nNo-Hangul guarantee (any leftover Korean would be flagged):');
const stress = [
  '낯선모델 V8',                       // intentionally not in dictionary
  '카이엔 쿠페 GTS',
  '마칸 4 일렉트릭',
  '람보르기니 우라칸',
];
for (const input of stress) {
  const got = translate(input);
  const hasKr = containsHangul(got);
  console.log(`  ${hasKr ? 'FAIL' : 'PASS'}  ${input} → ${got}`);
  if (hasKr) fail += 1;
  else pass += 1;
}

console.log('\nRegion translation:');
for (const [input, expected] of [['서울', 'Seoul'], ['부산', 'Busan'], ['경기', 'Gyeonggi']]) {
  const got = translateRegion(input);
  const ok = got === expected;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${input} → ${got}`);
  if (ok) pass += 1;
  else fail += 1;
}

console.log(`\n${pass}/${pass + fail} pass`);

console.log('\nUnmapped fragments report:');
reportUnmappedFragments(console);

process.exit(fail ? 1 : 0);
