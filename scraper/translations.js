/**
 * Korean → English translation pipeline for Encar model and trim strings.
 *
 * Strategy (in order):
 *   1. Apply the dictionary (longest-first match) — handles known
 *      loanwords correctly: 마칸 → Macan, not Makan.
 *   2. Tidy up whitespace and stray punctuation.
 *   3. If anything Korean still remains, transliterate the leftovers via
 *      hangul.js. The result isn't always pretty but it's never Hangul.
 *   4. Log a one-time warning per unknown Korean fragment so we can
 *      extend the dictionary over time.
 *
 * Order in the dictionary matters: longer strings first so "5시리즈" wins
 * over "시리즈" alone. The build step below sorts by length descending.
 */

const { transliterate, containsHangul } = require('./hangul');

// ---------------------------------------------------------------------------
// Dictionaries
// ---------------------------------------------------------------------------

// Per-make model names. Intentionally exhaustive — these are loanwords and
// transliteration would mangle them ("Macan" → "Makan", etc.).
const MODELS = {
  // Porsche -----------------------------------------------------------------
  '마칸': 'Macan',
  '카이엔': 'Cayenne',
  '카이맨': 'Cayman',
  '케이맨': 'Cayman',
  '박스터': 'Boxster',
  '파나메라': 'Panamera',
  '타이칸': 'Taycan',

  // Mercedes-Benz -----------------------------------------------------------
  '마이바흐': 'Maybach',
  '스프린터': 'Sprinter',
  '비토': 'Vito',
  '비아노': 'Viano',
  '메트리스': 'Metris',
  '시트로니아': 'Citan',

  // BMW ---------------------------------------------------------------------
  '미니': 'Mini',
  '미니쿠퍼': 'Mini Cooper',
  '쿠퍼': 'Cooper',
  '클럽맨': 'Clubman',
  '컨트리맨': 'Countryman',
  '롤스로이스': 'Rolls-Royce',
  '팬텀': 'Phantom',
  '고스트': 'Ghost',
  '컬리넌': 'Cullinan',
  '레이스': 'Wraith',
  '돈': 'Dawn',

  // Audi --------------------------------------------------------------------
  '아반트': 'Avant',
  '올로드': 'Allroad',
  '콰트로': 'Quattro',
  '쿼트로': 'Quattro',
  '스포트백': 'Sportback',
  '에트론': 'e-tron',

  // Hyundai -----------------------------------------------------------------
  '쏘나타': 'Sonata',
  '소나타': 'Sonata',
  '그랜저': 'Grandeur',
  '아반떼': 'Avante',
  '아반테': 'Avante',
  '엑센트': 'Accent',
  '에쿠스': 'Equus',
  '아슬란': 'Aslan',
  '제네시스': 'Genesis',
  '갤로퍼': 'Galloper',
  '베라크루즈': 'Veracruz',
  '싼타페': 'Santa Fe',
  '산타페': 'Santa Fe',
  '투싼': 'Tucson',
  '코나': 'Kona',
  '베뉴': 'Venue',
  '팰리세이드': 'Palisade',
  '맥스크루즈': 'Maxcruz',
  '벨로스터': 'Veloster',
  '아이오닉': 'Ioniq',
  '넥쏘': 'Nexo',
  '캐스퍼': 'Casper',
  '포터': 'Porter',
  '리베로': 'Libero',
  '스타리아': 'Staria',
  '스타렉스': 'Starex',
  '그랜드스타렉스': 'Grand Starex',
  '마이티': 'Mighty',
  '쏠라티': 'Solati',
  '솔라티': 'Solati',
  '테라칸': 'Terracan',
  '투스카니': 'Tuscani',
  '티뷰론': 'Tiburon',
  '베르나': 'Verna',
  '클릭': 'Click',
  '겟츠': 'Getz',
  '라비타': 'Lavita',
  '트라제': 'Trajet',
  '엑시언트': 'Xcient',
  '뉴엑센트': 'New Accent',

  // Kia ---------------------------------------------------------------------
  '스포티지': 'Sportage',
  '쏘렌토': 'Sorento',
  '소렌토': 'Sorento',
  '카니발': 'Carnival',
  '모하비': 'Mohave',
  '니로': 'Niro',
  '셀토스': 'Seltos',
  '스팅어': 'Stinger',
  '레이': 'Ray',
  '모닝': 'Morning',
  '프라이드': 'Pride',
  '옵티마': 'Optima',
  '오피러스': 'Opirus',
  '카렌스': 'Carens',
  '봉고': 'Bongo',
  '카스타': 'Carstar',
  '엔터프라이즈': 'Enterprise',
  '쏘울': 'Soul',
  '소울': 'Soul',
  '로체': 'Lotze',
  '포르테': 'Forte',
  '쎄라토': 'Cerato',
  '세라토': 'Cerato',
  '카렌즈': 'Carens',
  '뉴스포티지': 'New Sportage',

  // Toyota ------------------------------------------------------------------
  '캠리': 'Camry',
  '아발론': 'Avalon',
  '시에나': 'Sienna',
  '라브': 'RAV',
  '프리우스': 'Prius',
  '코롤라': 'Corolla',
  '하이랜더': 'Highlander',
  '라이즈': 'Raize',
  '알파드': 'Alphard',
  '벨파이어': 'Vellfire',
  '랜드크루저': 'Land Cruiser',
  '4러너': '4Runner',
  '타코마': 'Tacoma',
  '툰드라': 'Tundra',

  // Lexus -------------------------------------------------------------------
  '렉서스': 'Lexus',

  // Nissan ------------------------------------------------------------------
  '로그': 'Rogue',
  '알티마': 'Altima',
  '맥시마': 'Maxima',
  '무라노': 'Murano',
  '패스파인더': 'Pathfinder',
  '아르마다': 'Armada',
  '엑스테라': 'Xterra',
  '타이탄': 'Titan',
  '큐브': 'Cube',
  '주크': 'Juke',
  '리프': 'Leaf',
  '370Z': '370Z',
  '350Z': '350Z',

  // Honda -------------------------------------------------------------------
  '시빅': 'Civic',
  '어코드': 'Accord',
  '파일럿': 'Pilot',
  '오디세이': 'Odyssey',
  '리지라인': 'Ridgeline',
  '엘리먼트': 'Element',
  '인사이트': 'Insight',
  '레전드': 'Legend',
  '피트': 'Fit',

  // Ford --------------------------------------------------------------------
  '머스탱': 'Mustang',
  '익스플로러': 'Explorer',
  '익스페디션': 'Expedition',
  '토러스': 'Taurus',
  '엣지': 'Edge',
  '퓨전': 'Fusion',
  '플렉스': 'Flex',
  '브롱코': 'Bronco',
  '에스케이프': 'Escape',
  '이스케이프': 'Escape',
  '레인저': 'Ranger',
  '에코스포츠': 'EcoSport',
  '갤럭시': 'Galaxy',
  '몬데오': 'Mondeo',
  '포커스': 'Focus',
  '피에스타': 'Fiesta',

  // Chevrolet / GM ----------------------------------------------------------
  '카마로': 'Camaro',
  '콜벳': 'Corvette',
  '콜로라도': 'Colorado',
  '실버라도': 'Silverado',
  '서버번': 'Suburban',
  '타호': 'Tahoe',
  '에쿼녹스': 'Equinox',
  '트래버스': 'Traverse',
  '말리부': 'Malibu',
  '임팔라': 'Impala',
  '크루즈': 'Cruze',
  '소닉': 'Sonic',
  '스파크': 'Spark',
  '트래커': 'Tracker',
  '트랙스': 'Trax',
  '캡티바': 'Captiva',

  // Volkswagen --------------------------------------------------------------
  '골프': 'Golf',
  '제타': 'Jetta',
  '파사트': 'Passat',
  '아테온': 'Arteon',
  '폴로': 'Polo',
  '시로코': 'Scirocco',
  '비틀': 'Beetle',
  '투아렉': 'Touareg',
  '티구안': 'Tiguan',
  '아틀라스': 'Atlas',
  '샤란': 'Sharan',
  '뉴비틀': 'New Beetle',

  // Volvo, Jaguar, Land Rover -----------------------------------------------
  '볼보': 'Volvo',
  '디스커버리': 'Discovery',
  '레인지로버': 'Range Rover',
  '디펜더': 'Defender',
  '프리랜더': 'Freelander',
  '이보크': 'Evoque',
  '벨라': 'Velar',
  '스포트': 'Sport',

  // Ferrari -----------------------------------------------------------------
  '캘리포니아': 'California',
  '포르토피노': 'Portofino',
  '로마': 'Roma',
  '라페라리': 'LaFerrari',
  '아말피': 'Amalfi',
  '엔조': 'Enzo',
  '스칼리에티': 'Scaglietti',
  '베를리네타': 'Berlinetta',
  '푸로산게': 'Purosangue',

  // Aston Martin ------------------------------------------------------------
  '밴티지': 'Vantage',
  '라피드': 'Rapide',
  '뱅퀴시': 'Vanquish',
  '비라지': 'Virage',

  // Tesla -------------------------------------------------------------------
  '모델': 'Model',
  '사이버트럭': 'Cybertruck',
  '로드스터': 'Roadster',

  // Misc EV brands ----------------------------------------------------------
  '폴스타': 'Polestar',
  '루시드': 'Lucid',
  '리비안': 'Rivian',
};

// Body / class words used inside model names.
const BODY_WORDS = {
  '시리즈': 'Series',
  '클래스': 'Class',
  '쿠페': 'Coupe',
  '세단': 'Sedan',
  '왜건': 'Wagon',
  '에스테이트': 'Estate',
  '투어링': 'Touring',
  '해치백': 'Hatchback',
  '컨버터블': 'Convertible',
  '카브리올레': 'Cabriolet',
  '카브리올': 'Cabriolet',
  '컴팩트': 'Compact',
  '미니밴': 'Minivan',
  '밴': 'Van',
  '픽업': 'Pickup',
  '트럭': 'Truck',
  '리무진': 'Limousine',
  '리무진밴': 'Limo Van',
  '롱바디': 'Long Body',
  '숏바디': 'Short Body',
};

// Trim / spec descriptors. Order matters when one is a substring of
// another — longer ones first.
const TRIM_WORDS = {
  '플러그인 하이브리드': 'Plug-in Hybrid',
  '플러그인하이브리드': 'Plug-in Hybrid',
  '플러그인': 'Plug-in',
  '마일드 하이브리드': 'Mild Hybrid',
  '마일드하이브리드': 'Mild Hybrid',
  '풀체인지': 'Full Change',
  '페이스리프트': 'Facelift',
  '페이스 리프트': 'Facelift',
  '하이브리드': 'Hybrid',
  '디젤': 'Diesel',
  '가솔린': 'Petrol',
  '벤진': 'Petrol',
  '전기차': 'EV',
  '전기': 'Electric',
  '수소': 'Hydrogen',
  '4매틱': '4Matic',
  '포매틱': '4Matic',
  '엑스드라이브': 'xDrive',
  '에스라인': 'S Line',
  '에스 라인': 'S Line',
  '엠스포츠': 'M Sport',
  '엠 스포츠': 'M Sport',
  'AMG': 'AMG',
  '엠팩': 'M Pack',
  '스포츠 패키지': 'Sport Package',
  '스포츠패키지': 'Sport Package',
  '스포츠': 'Sport',
  '에어로': 'Aero',
  '다이나믹': 'Dynamic',
  '다이내믹': 'Dynamic',
  '프리미엄': 'Premium',
  '럭셔리': 'Luxury',
  '이그제큐티브': 'Executive',
  '익스큐티브': 'Executive',
  '익스클루시브': 'Exclusive',
  '컴포트': 'Comfort',
  '엘레강스': 'Elegance',
  '아방가르드': 'Avantgarde',
  '인스피레이션': 'Inspiration',
  '인스파이어': 'Inspire',
  '디자인': 'Design',
  '에디션': 'Edition',
  '패키지': 'Package',
  '플러스': 'Plus',
  '프로페셔널': 'Professional',
  '프로': 'Pro',
  // BMW / Mercedes / Porsche / etc. trim words seen in real listings
  '컴페티션': 'Competition',
  '퍼포먼스': 'Performance',
  '퓨어': 'Pure',
  '엑셀런스': 'Excellence',
  '인디비주얼': 'Individual',
  '투어러': 'Tourer',
  '조이': 'Joy',
  '퍼스트': 'First',
  '스페셜': 'Special',
  '어드밴스': 'Advance',
  '어드밴스드': 'Advanced',
  '어드': 'Adv',
  '솔': 'Sol',
  '쉐도우': 'Shadow',
  '섀도우': 'Shadow',
  '베이직': 'Basic',
  '엔트리': 'Entry',
  '시그니처': 'Signature',
  '프레스티지': 'Prestige',
  '익스프레션': 'Expression',
  '하이라인': 'Highline',
  '에브리타임': 'Everytime',
  '셀렉트': 'Select',
  '스탠다드': 'Standard',
  '스마트': 'Smart',
  '액티브': 'Active',
  '뉴': 'New',
  '구': 'Old',
  '신형': 'New',
  '구형': 'Old',
  '전기형': 'Pre-facelift',
  '후기형': 'Facelift',
  '그란': 'Gran',
  '투리스모': 'Turismo',
  '투리스모스포츠': 'Turismo Sport',
  '쿠페형': 'Coupe',
  '왜건형': 'Wagon',
  '컨트리': 'Country',
  '크로스': 'Cross',
  '컴포트라인': 'Comfortline',
  '트랜드라인': 'Trendline',
  '하이엔드': 'High-end',
  '베이스': 'Base',
  // Door / seat suffixes (e.g. "4도어", "5인승")
  '도어': '-door',
  '인승': '-seater',
};

// Drivetrain words.
const DRIVETRAIN_WORDS = {
  '전륜구동': 'FWD',
  '후륜구동': 'RWD',
  '사륜구동': 'AWD',
  '전륜': 'FWD',
  '후륜': 'RWD',
  '사륜': 'AWD',
  '오토매틱': 'Automatic',
  '오토메틱': 'Automatic',
  '매뉴얼': 'Manual',
  '수동': 'Manual',
  '자동': 'Automatic',
};

// Region / location words. Encar's `OfficeCityState` returns Korean city
// names; we translate the common ones for nicer display.
const REGION_WORDS = {
  '서울': 'Seoul',
  '경기': 'Gyeonggi',
  '인천': 'Incheon',
  '부산': 'Busan',
  '대구': 'Daegu',
  '대전': 'Daejeon',
  '광주': 'Gwangju',
  '울산': 'Ulsan',
  '세종': 'Sejong',
  '강원': 'Gangwon',
  '충북': 'Chungbuk',
  '충남': 'Chungnam',
  '전북': 'Jeonbuk',
  '전남': 'Jeonnam',
  '경북': 'Gyeongbuk',
  '경남': 'Gyeongnam',
  '제주': 'Jeju',
};

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build one combined rule list and sort by key length descending so that
// "5시리즈" can match before "시리즈".
function buildRules(...tables) {
  const entries = [];
  for (const table of tables) {
    for (const [k, v] of Object.entries(table)) {
      if (k && v != null) entries.push([k, v]);
    }
  }
  entries.sort((a, b) => b[0].length - a[0].length);
  return entries.map(([k, v]) => [new RegExp(escapeRegex(k), 'g'), v]);
}

const ALL_RULES = buildRules(MODELS, BODY_WORDS, TRIM_WORDS, DRIVETRAIN_WORDS);
const REGION_RULES = buildRules(REGION_WORDS);

// Track unmapped Hangul fragments seen during a run so the operator can
// extend the dictionary. Keyed by lowercase original to dedupe.
const _unmappedFragments = new Set();

function applyRules(rules, input) {
  let out = input;
  for (const [re, replacement] of rules) {
    out = out.replace(re, replacement);
  }
  return out;
}

// Words that semantically start a phrase. When a Korean→English replacement
// produces e.g. "5Series" (digit glued to "Series"), we want "5 Series".
// We don't want to break compounds like "S-Class" or "iX5" though, hence
// the explicit list and the hyphen exception.
const SPACEY_WORDS = [
  'Series', 'Class', 'Sedan', 'Coupe', 'Wagon', 'Estate', 'Touring',
  'Hatchback', 'Convertible', 'Cabriolet', 'Limousine', 'Pickup',
  'Roadster', 'Avant', 'Quattro', 'Allroad', 'Sportback',
];
const SPACEY_REGEX = new RegExp(`(\\S)(${SPACEY_WORDS.join('|')})`, 'g');

function tidy(input) {
  let out = input
    .replace(SPACEY_REGEX, (match, prev, word) =>
      // Keep "S-Class", "C-Class" etc. glued.
      prev === '-' ? match : `${prev} ${word}`
    )
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.\)\]])/g, '$1')
    .replace(/([\(\[])\s+/g, '$1')
    .trim();
  return out;
}

/**
 * Translate a model / trim string. Guarantees no Hangul in the output:
 *   1. Apply the loanword dictionary.
 *   2. If anything Korean remains, transliterate via hangul.js.
 */
function translate(input) {
  if (!input) return input;

  const original = String(input);
  let out = applyRules(ALL_RULES, original);
  out = tidy(out);

  if (containsHangul(out)) {
    // Record the leftover so we can extend MODELS over time.
    const leftover = out.match(/[\uAC00-\uD7A3]+/g) ?? [];
    for (const frag of leftover) {
      if (!_unmappedFragments.has(frag)) {
        _unmappedFragments.add(frag);
      }
    }
    out = transliterate(out);
    out = tidy(out);
  }

  return out;
}

/** Translate a region/seller-city string (separate dictionary, same flow). */
function translateRegion(input) {
  if (!input) return input;
  let out = applyRules(REGION_RULES, String(input));
  out = tidy(out);
  if (containsHangul(out)) out = tidy(transliterate(out));
  return out;
}

/**
 * Collect-then-print helper for dev/CI: shows which Korean fragments leaked
 * through the dictionary so we can add them. Call this once at end of a
 * sync run (the scraper does that).
 */
function reportUnmappedFragments(logger = console) {
  if (!_unmappedFragments.size) return;
  const list = Array.from(_unmappedFragments).sort();
  logger.warn(
    `Translation gaps: ${list.length} Korean fragment(s) had no dictionary ` +
      `entry and were transliterated. Consider adding them to MODELS in ` +
      `scraper/translations.js:`
  );
  for (const frag of list.slice(0, 50)) logger.warn(`   ${frag}`);
  if (list.length > 50) logger.warn(`   …and ${list.length - 50} more`);
}

function _resetUnmappedFragmentsForTests() {
  _unmappedFragments.clear();
}

module.exports = {
  translate,
  translateRegion,
  reportUnmappedFragments,
  _resetUnmappedFragmentsForTests,
};
