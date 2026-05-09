/**
 * Korean → localized token translation pipeline.
 *
 * Called both from server-side normalizers (so the cached payload is
 * already partly translated) AND from the client at render time, so the
 * language toggle re-translates known terms from the original Korean.
 *
 * Strategy:
 *   1. Apply the language-specific dictionary (longest match first).
 *   2. Apply the shared/loanword dictionary as a fallback for tokens
 *      that aren't language-specific (proper-noun model names, etc.).
 *   3. Tidy whitespace + insert spaces between digits and word tokens.
 *   4. If anything Korean still remains, transliterate via hangul.ts.
 */

import { containsHangul, transliterate } from "./hangul";

export type Language = "sq" | "en";

// ---------------------------------------------------------------------------
// Dictionaries
// ---------------------------------------------------------------------------

// Subset of the scraper's MODELS — common loanwords that appear in
// inspection reports and detail pages.
const TOKENS: Record<string, string> = {
  // Body / class
  "시리즈": "Series",
  "클래스": "Class",
  "쿠페": "Coupe",
  "세단": "Sedan",
  "왜건": "Wagon",
  "에스테이트": "Estate",
  "투어링": "Touring",
  "해치백": "Hatchback",
  "컨버터블": "Convertible",
  "카브리올레": "Cabriolet",
  "리무진": "Limousine",

  // Trim / spec descriptors
  "플러그인 하이브리드": "Plug-in Hybrid",
  "플러그인하이브리드": "Plug-in Hybrid",
  "마일드 하이브리드": "Mild Hybrid",
  "하이브리드": "Hybrid",
  "디젤": "Diesel",
  "가솔린": "Petrol",
  "벤진": "Petrol",
  "전기차": "EV",
  "전기": "Electric",
  "수소": "Hydrogen",
  "오토": "Automatic",
  "오토매틱": "Automatic",
  "수동": "Manual",
  "매뉴얼": "Manual",
  "자동": "Automatic",
  "4매틱": "4Matic",
  "엑스드라이브": "xDrive",
  "에스라인": "S Line",
  "엠스포츠": "M Sport",
  "스포츠": "Sport",
  "프리미엄": "Premium",
  "럭셔리": "Luxury",
  "이그제큐티브": "Executive",
  "익스클루시브": "Exclusive",
  "엘레강스": "Elegance",
  "아방가르드": "Avantgarde",
  "디자인": "Design",
  "에디션": "Edition",
  "패키지": "Package",
  "플러스": "Plus",
  "프로페셔널": "Professional",
  "프로": "Pro",
  "그란": "Gran",
  "투리스모": "Turismo",

  // ---- Inspection-specific vocabulary --------------------------------------
  // Inspector agency / company / organisational suffixes. KADA is the
  // common acronym in Korean industry for the Korean Auto Diagnosis
  // Warranty Association.
  "한국자동차진단보증협회": "KADA",
  "주식회사": "Co., Ltd.",
  "스마일진단": "Smile Diagnosis",
  "진단": "Diagnosis",
  "협회": "Association",
  "자동차": "Automotive",
  "보증": "Warranty",

  // Color words seen in spec.colorName
  "흰색": "White",
  "검정": "Black",
  "검은색": "Black",
  "은색": "Silver",
  "쥐색": "Gray",
  "회색": "Gray",
  "빨강": "Red",
  "파랑": "Blue",
  "노랑": "Yellow",
  "초록": "Green",
  "갈색": "Brown",
  "주황": "Orange",
  "남색": "Navy",
  "분홍": "Pink",
  "보라": "Purple",
  "황금색": "Gold",
  "무채색": "Achromatic",
  "유채색": "Chromatic",

  // Mileage / record statuses
  "양호": "Good",
  "적정": "Adequate",
  "없음": "None",
  "미세누유": "Minor seepage",
  "누유": "Leak",
  "미세누수": "Minor seepage",
  "누수": "Leak",
  "부족": "Insufficient",
  "과다": "Excessive",
  "불량": "Faulty",
  "있음": "Present",

  // Body-panel observation wording (also mapped to enum below)
  "교환": "Replaced",
  "판금": "Panel-beat",
  "부식": "Corrosion",
  "흠집": "Scratch",
  "손상": "Damage",
  "용접": "Welded",
  "도색": "Painted",
  "우그러짐": "Dent",
  "찌그러짐": "Dent",

  // Common report wording (used by inspector "comments")
  "비금속": "Non-metallic",
  "플라스틱": "Plastic",
  "탈부착": "Detachable",
  "가능": "Possible",
  "부품": "Parts",
  "부품은": "parts are",
  "점검사항": "Inspection scope",
  "점검사항에서": "from inspection scope",
  "제외": "Excluded",
  "제외되며": "are excluded, and",
  "중고차": "Used car",
  "특성": "Characteristics",
  "특성 상": "due to the nature of",
  "부분적": "Partial",
  "부분적인": "partial",
  "도색 및": "painting and",
  "차량": "Vehicle",
  "차량의": "the vehicle's",
  "노후화": "Aging",
  "노후화에": "aging",
  "따른": "due to",
  "자연스러운": "Natural",
  "자연스러운 부식": "natural corrosion",
  "있을 수 있습니다": "may be present",
  "있을": "Present",
  "수": "may",
  "있습니다": "is present",
  "포함": "Included",

  // ---- Detailed inspection: section names + sub-items ---------------------
  "자기진단": "Self-diagnosis",
  "원동기": "Engine",
  "변속기": "Transmission",
  "동력전달": "Power transmission",
  "조향": "Steering",
  "제동": "Brakes",
  "연료": "Fuel system",
  "수리필요": "Needs repair",
  "기본품목": "Basic equipment",

  // Engine sub-items
  // Korean conjunctions / particles that show up in inspector phrases.
  // Without these, "및" transliterates to "Mit" and "Drive shaft 및
  // bearing" becomes "Drive shaft Mit Bearing".
  "및": "&",
  "또는": "or",
  "그리고": "and",

  "작동상태": "Operating status",
  "공회전": "Idle",
  "오일누유": "Oil leak",
  "냉각수누수": "Coolant leak",
  "실린더 커버": "Cylinder cover",
  "실린더커버": "Cylinder cover",
  "로커암 커버": "Rocker arm cover",
  "로커암커버": "Rocker arm cover",
  "실린더 헤드": "Cylinder head",
  "실린더헤드": "Cylinder head",
  "개스킷": "Gasket",
  "실린더 블록": "Cylinder block",
  "실린더블록": "Cylinder block",
  "오일팬": "Oil pan",
  "오일 유량": "Oil flow rate",
  "오일유량": "Oil flow rate",
  "오일유량 및 상태": "Oil flow rate & condition",

  // Cooling
  "워터펌프": "Water pump",
  "라디에이터": "Radiator",
  "냉각수": "Coolant",
  "냉각수 수량": "Coolant level",
  "수량": "Level",

  // Transmission
  "자동변속기": "Automatic transmission",
  "수동변속기": "Manual transmission",
  "오일": "Oil",
  "유량": "Flow rate",
  "상태": "Condition",
  "A/T": "A/T",
  "M/T": "M/T",

  // Power transmission / drivetrain
  "클러치": "Clutch",
  "어셈블리": "Assembly",
  "클러치 어셈블리": "Clutch assembly",
  "등속조인트": "Constant velocity joint",
  "추진축": "Drive shaft",
  "추친축": "Drive shaft",
  "베어링": "Bearing",
  "디피렌셜": "Differential",
  "기어": "Gear",
  "디피렌셜 기어": "Differential gear",

  // Steering
  "동력조향": "Power steering",
  "스티어링": "Steering",
  "스티어링 펌프": "Steering pump",
  "스티어링 기어": "Steering gear",
  // Source already wraps these in parens — the replacement must NOT
  // add another pair, otherwise we get "((incl. MDPS))".
  "MDPS포함": "incl. MDPS",
  "스티어링 조인트": "Steering joint",
  "파워고압호스": "High-pressure hose",
  "타이로드엔드": "Tie-rod end",
  "타이로드": "Tie-rod",
  "엔드": "End",
  "볼 조인트": "Ball joint",
  "볼조인트": "Ball joint",

  // Brakes
  "브레이크": "Brake",
  "마스터 실린더": "Master cylinder",
  "마스터실린더": "Master cylinder",
  "브레이크 마스터 실린더오일 누유": "Brake master cylinder oil leak",
  "브레이크 오일": "Brake oil",
  "브레이크 오일 누유": "Brake oil leak",
  "배력장치": "Booster",
  "배력장치 상태": "Booster condition",

  // Electrical
  "발전기": "Alternator",
  "출력": "Output",
  "발전기 출력": "Alternator output",
  "시동": "Starter",
  "시동 모터": "Starter motor",
  "와이퍼": "Wiper",
  "모터": "Motor",
  "와이퍼 모터": "Wiper motor",
  "와이퍼 모터 기능": "Wiper motor function",
  "기능": "Function",
  "실내": "Interior",
  "송풍": "Blower",
  "실내송풍 모터": "Cabin blower motor",
  "팬": "Fan",
  "라디에이터 팬 모터": "Radiator fan motor",
  "윈도우": "Window",
  "윈도우 모터": "Window motor",

  // Fuel
  "연료누출": "Fuel leak",
  "LP가스포함": "incl. LPG",
  "LP가스": "LPG",

  // Misc / etc-section items
  "외장": "Exterior",
  "내장": "Interior",
  "광택": "Polish",
  "룸 클리링": "Interior cleaning",
  "휠": "Wheel",
  "타이어": "Tyre",
  "유리": "Glass",
  "보유상태": "Status",
  "사용설명서": "Manual",
  "안전삼각대": "Safety triangle",
  "잭": "Jack",
  "스패너": "Spanner",
  "운전석": "Driver-side",
  "동반석": "Passenger-side",
  "운전석 전": "Driver front",
  "운전석 후": "Driver rear",
  "동반석 전": "Passenger front",
  "동반석 후": "Passenger rear",
  "응급": "Spare",

  // ---- Body-panel + frame-panel titles -------------------------------------
  // Encar's outer-panel inspection uses these compound nouns (e.g.
  // "쿼터 패널(우)" = Quarter Panel Right). Without these, the
  // hangul fallback emits transliterations like "Kwoteo Paeneol(U)".
  // L/R suffixes are handled below as standalone tokens so they work
  // regardless of which compound the Korean source uses.
  "후드": "Hood",
  "본넷": "Bonnet",
  "프론트 범퍼": "Front bumper",
  "리어 범퍼": "Rear bumper",
  "프론트 휀더": "Front fender",
  "프론트휀더": "Front fender",
  "프론트 도어": "Front door",
  "프론트도어": "Front door",
  "리어 도어": "Rear door",
  "리어도어": "Rear door",
  "트렁크 리드": "Trunk lid",
  "트렁크리드": "Trunk lid",
  "트렁크 플로어": "Trunk floor",
  "라디에이터 서포트": "Radiator support",
  "라디에이터서포트": "Radiator support",
  "볼트체결부품": "bolt-fastened",
  "루프 패널": "Roof panel",
  "루프패널": "Roof panel",
  "루프": "Roof",
  "쿼터 패널": "Quarter panel",
  "쿼터패널": "Quarter panel",
  "사이드 실 패널": "Side sill",
  "사이드실 패널": "Side sill",
  "사이드실패널": "Side sill",
  "사이드 실": "Side sill",
  "사이드실": "Side sill",
  "프론트 패널": "Front panel",
  "프론트패널": "Front panel",
  "리어 패널": "Rear panel",
  "리어패널": "Rear panel",
  "리어 사이드 패널": "Rear side panel",
  "리어사이드패널": "Rear side panel",
  "인사이드 패널": "Inside panel",
  "인사이드패널": "Inside panel",
  "프론트 휠하우스": "Front wheel house",
  "프론트휠하우스": "Front wheel house",
  "리어 휠하우스": "Rear wheel house",
  "리어휠하우스": "Rear wheel house",
  "휠하우스": "Wheel house",
  "사이드 멤버": "Side member",
  "사이드멤버": "Side member",
  "크로스 멤버": "Cross member",
  "크로스멤버": "Cross member",
  "플로어 패널": "Floor panel",
  "플로어패널": "Floor panel",
  "프론트 필러": "Front pillar",
  "프론트필러": "Front pillar",
  "센터 필러": "Center pillar",
  "센터필러": "Center pillar",
  "미들 필러": "Center pillar",
  "미들필러": "Center pillar",
  "리어 필러": "Rear pillar",
  "리어필러": "Rear pillar",
  "패널": "Panel",
  // L/R suffixes — Encar wraps these in parens, e.g. "쿼터 패널(우)".
  // We deliberately only match the parenthesized forms; the bare 좌/우
  // characters appear in many unrelated Korean words (좌석, 우측, …).
  "(좌)": " (L)",
  "(우)": " (R)",
};

// Albanian overrides for the inspection terms. Keys not listed here
// fall through to the English TOKENS dictionary above (acceptable for
// proper-noun model names like "Macan" / "Cayenne" / "Sportage" which
// stay identical across languages anyway).
const SQ_OVERRIDES: Record<string, string> = {
  // Sections
  "자기진단": "Vetë-diagnostikim",
  "원동기": "Motori",
  "변속기": "Transmisioni",
  "동력전달": "Sistemi i tërheqjes",
  "조향": "Drejtimi",
  "제동": "Frenat",
  "연료": "Sistemi i karburantit",
  "수리필요": "Nevojë për riparim",
  "기본품목": "Pajisjet bazë",
  "외장": "E jashtme",
  "내장": "E brendshme",
  "광택": "Llustrim",
  "휠": "Rrota",
  "타이어": "Goma",
  "유리": "Xhami",
  "보유상태": "Statusi",

  // Common engine / transmission / drivetrain components
  "작동상태": "Statusi i funksionimit",
  "공회전": "Pa ngarkesë",
  "오일누유": "Rrjedhje vaji",
  "냉각수누수": "Rrjedhje ftohësi",
  "실린더 커버": "Kapak cilindri",
  "실린더커버": "Kapak cilindri",
  "로커암 커버": "Kapak rocker arm",
  "실린더 헤드": "Kokë cilindri",
  "실린더헤드": "Kokë cilindri",
  "개스킷": "Guarnicion",
  "실린더 블록": "Bllok cilindri",
  "실린더블록": "Bllok cilindri",
  "오일팬": "Vasa e vajit",
  "오일 유량": "Sasia e vajit",
  "오일유량": "Sasia e vajit",
  "오일유량 및 상태": "Sasia & gjendja e vajit",
  "워터펌프": "Pompa ujit",
  "라디에이터": "Radiator",
  "냉각수": "Lëngu ftohës",
  "냉각수 수량": "Niveli i ftohësit",

  // Transmission / drivetrain
  "자동변속기": "Transmisioni automatik",
  "수동변속기": "Transmisioni manual",
  "오일": "Vaj",
  "유량": "Niveli",
  "상태": "Gjendja",
  "클러치": "Friksioni",
  "어셈블리": "Asambleja",
  "클러치 어셈블리": "Asambleja e friksionit",
  "등속조인트": "Nyje me shpejtësi konstante",
  "추진축": "Boshti i transmisionit",
  "추친축": "Boshti i transmisionit",
  "추친축 및 베어링": "Boshti i transmisionit & kushinetat",
  "추진축 및 베어링": "Boshti i transmisionit & kushinetat",
  "베어링": "Kushineta",
  "디피렌셜": "Diferenciali",
  "기어": "Marshi",
  "디피렌셜 기어": "Marshi diferencial",

  // Steering
  "동력조향": "Drejtimi me servo",
  "동력조향 작동 오일 누유": "Rrjedhje vaji të drejtimit me servo",
  "스티어링": "Drejtimi",
  "스티어링 펌프": "Pompa e drejtimit",
  "스티어링 기어": "Mekanizmi i drejtimit",
  "스티어링 기어(MDPS포함)": "Mekanizmi i drejtimit (përfsh. MDPS)",
  "스티어링 조인트": "Nyja e drejtimit",
  "파워고압호스": "Tubi me presion të lartë",
  "타이로드엔드": "Skaji i tie-rod-it",
  "타이로드엔드 및 볼 조인트": "Skaji i tie-rod-it & nyja sferike",
  "타이로드": "Tie-rod",
  "엔드": "Skaj",
  "볼 조인트": "Nyja sferike",
  "볼조인트": "Nyja sferike",

  // Korean conjunctions/particles in SQ context
  "및": "&",
  "또는": "ose",
  "그리고": "dhe",
  "MDPS포함": "përfsh. MDPS",
  "LP가스포함": "përfsh. LPG",

  // Brakes
  "브레이크": "Frenat",
  "마스터 실린더": "Cilindri master",
  "마스터실린더": "Cilindri master",
  "브레이크 오일": "Vaji i frenave",
  "브레이크 오일 누유": "Rrjedhje vaji të frenave",
  "브레이크 마스터 실린더오일 누유": "Rrjedhje vaji në cilindrin master",
  "배력장치": "Servo-fren",
  "배력장치 상태": "Gjendja e servo-frenit",

  // Electrical
  "발전기": "Alternatori",
  "출력": "Fuqia",
  "발전기 출력": "Fuqia e alternatorit",
  "시동": "Ndezja",
  "시동 모터": "Motori i ndezjes",
  "와이퍼": "Fshirëse",
  "모터": "Motor",
  "와이퍼 모터": "Motori i fshirëses",
  "와이퍼 모터 기능": "Funksioni i fshirëses",
  "기능": "Funksioni",
  "실내": "Brendësia",
  "송풍": "Ajrosja",
  "실내송풍 모터": "Motori i ajrosjes së brendshme",
  "팬": "Ventilatori",
  "라디에이터 팬 모터": "Motori i ventilatorit të radiatorit",
  "윈도우": "Dritarja",
  "윈도우 모터": "Motori i dritareve",

  // Fuel
  "연료누출": "Rrjedhje karburanti",
  "연료누출(LP가스포함)": "Rrjedhje karburanti (përfsh. LPG)",

  // Drive sides (etc-section items)
  "운전석": "Ana e drejtuesit",
  "동반석": "Ana e pasagjerit",
  "응급": "Rezervë",

  // Statuses
  "양호": "Mirë",
  "적정": "Mirë",
  "없음": "Pa probleme",
  "미세누유": "Rrjedhje e lehtë",
  "누유": "Rrjedhje",
  "미세누수": "Rrjedhje e lehtë",
  "누수": "Rrjedhje",
  "부족": "I pamjaftueshëm",
  "과다": "I tepërt",
  "불량": "Defekt",
  "있음": "I pranishëm",

  // Body-panel statuses
  "교환": "I zëvendësuar",
  "판금": "I rrahur",
  "부식": "Korrozion",
  "흠집": "Gërvishtje",
  "손상": "I dëmtuar",
  "용접": "I salduar",
  "도색": "I lyer",
  "우그러짐": "I gërvishtur",

  // Body-panel + frame-panel titles
  "후드": "Kofano",
  "본넷": "Kofano",
  "프론트 범퍼": "Parakolpi i përparmë",
  "리어 범퍼": "Parakolpi i pasmë",
  "프론트 휀더": "Fenderi i përparmë",
  "프론트휀더": "Fenderi i përparmë",
  "프론트 도어": "Dera e përparme",
  "프론트도어": "Dera e përparme",
  "리어 도어": "Dera e pasme",
  "리어도어": "Dera e pasme",
  "트렁크 리드": "Kapaku i bagazhit",
  "트렁크리드": "Kapaku i bagazhit",
  "트렁크 플로어": "Dyshemeja e bagazhit",
  "라디에이터 서포트": "Mbështetësja e radiatorit",
  "라디에이터서포트": "Mbështetësja e radiatorit",
  "볼트체결부품": "me bulona",
  "루프 패널": "Paneli i çatisë",
  "루프패널": "Paneli i çatisë",
  "루프": "Çati",
  "쿼터 패널": "Paneli anësor",
  "쿼터패널": "Paneli anësor",
  "사이드 실 패널": "Pragu anësor",
  "사이드실 패널": "Pragu anësor",
  "사이드실패널": "Pragu anësor",
  "사이드 실": "Pragu anësor",
  "사이드실": "Pragu anësor",
  "프론트 패널": "Paneli i përparmë",
  "프론트패널": "Paneli i përparmë",
  "리어 패널": "Paneli i pasmë",
  "리어패널": "Paneli i pasmë",
  "리어 사이드 패널": "Paneli anësor i pasmë",
  "리어사이드패널": "Paneli anësor i pasmë",
  "인사이드 패널": "Paneli i brendshëm",
  "인사이드패널": "Paneli i brendshëm",
  "프론트 휠하우스": "Streha e rrotës së përparme",
  "프론트휠하우스": "Streha e rrotës së përparme",
  "리어 휠하우스": "Streha e rrotës së pasme",
  "리어휠하우스": "Streha e rrotës së pasme",
  "휠하우스": "Streha e rrotës",
  "사이드 멤버": "Pjesa anësore",
  "사이드멤버": "Pjesa anësore",
  "크로스 멤버": "Pjesa kryqëzuese",
  "크로스멤버": "Pjesa kryqëzuese",
  "플로어 패널": "Paneli i dyshemesë",
  "플로어패널": "Paneli i dyshemesë",
  "프론트 필러": "Shtylla e përparme",
  "프론트필러": "Shtylla e përparme",
  "센터 필러": "Shtylla qendrore",
  "센터필러": "Shtylla qendrore",
  "미들 필러": "Shtylla qendrore",
  "미들필러": "Shtylla qendrore",
  "리어 필러": "Shtylla e pasme",
  "리어필러": "Shtylla e pasme",
  "패널": "Panel",
  "(좌)": " (majtas)",
  "(우)": " (djathtas)",

  // Colors
  "흰색": "E bardhë",
  "검정": "E zezë",
  "검은색": "E zezë",
  "은색": "Argjend",
  "쥐색": "Hiri",
  "회색": "Hiri",
  "빨강": "E kuqe",
  "파랑": "Blu",
  "노랑": "E verdhë",
  "초록": "E gjelbër",
  "갈색": "Kafe",
  "주황": "Portokalli",
  "남색": "Blu marin",
  "분홍": "Rozë",
  "보라": "Vjollcë",
  "황금색": "E artë",
  "무채색": "Pa ngjyrë",
  "유채색": "Me ngjyrë",
};

// Words that should always have a space before them when concatenated
// after a non-space character (e.g. "5Series" → "5 Series").
const SPACEY_WORDS = [
  "Series", "Class", "Sedan", "Coupe", "Wagon", "Estate", "Touring",
  "Hatchback", "Convertible", "Cabriolet", "Limousine",
];
const SPACEY_REGEX = new RegExp(`(\\S)(${SPACEY_WORDS.join("|")})`, "g");

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileRules(...maps: Record<string, string>[]): [RegExp, string][] {
  const merged = new Map<string, string>();
  // Last map wins, so callers pass overrides last (e.g. SQ first wins).
  for (const m of maps) for (const [k, v] of Object.entries(m)) merged.set(k, v);
  return Array.from(merged.entries())
    .filter(([k, v]) => k && v != null)
    .sort(([a], [b]) => b.length - a.length)
    .map(([k, v]) => [new RegExp(escapeRegex(k), "g"), v] as [RegExp, string]);
}

// EN rules use only the base TOKENS map. SQ rules apply SQ_OVERRIDES on
// top of TOKENS so any term not localised falls back to the English
// equivalent (still better than Korean leaking through).
const COMPILED_EN = compileRules(TOKENS);
const COMPILED_SQ = compileRules(TOKENS, SQ_OVERRIDES);

function tidy(input: string): string {
  return input
    .replace(SPACEY_REGEX, (match, prev, word) =>
      prev === "-" ? match : `${prev} ${word}`
    )
    .replace(/\s+/g, " ")
    .replace(/\s+([,.\)\]])/g, "$1")
    .replace(/([\(\[])\s+/g, "$1")
    .trim();
}

/**
 * Translate Korean tokens inside `input` to the requested language.
 * Anything still Korean after the dictionary pass gets transliterated,
 * so the output never contains Hangul. `lang` defaults to `"en"` for
 * back-compat with server-side callers that don't yet pass a language.
 */
export function translate(
  input: string | null | undefined,
  lang: Language = "en"
): string {
  if (!input) return "";
  let out = String(input);
  const rules = lang === "sq" ? COMPILED_SQ : COMPILED_EN;
  for (const [re, replacement] of rules) {
    out = out.replace(re, replacement);
  }
  out = tidy(out);
  if (containsHangul(out)) out = tidy(transliterate(out));
  return out;
}

// ---------------------------------------------------------------------------
// Body-panel statuses → enum (so the UI translates to sq/en via t())
// ---------------------------------------------------------------------------

export type PanelStatusKey =
  | "replaced"
  | "panel_beat"
  | "corrosion"
  | "scratch"
  | "damage"
  | "welded"
  | "painted"
  | "dent"
  | "unknown";

const PANEL_STATUS_BY_KOREAN: Record<string, PanelStatusKey> = {
  "교환": "replaced",
  "판금": "panel_beat",
  "부식": "corrosion",
  "흠집": "scratch",
  "손상": "damage",
  "용접": "welded",
  "도색": "painted",
  "우그러짐": "dent",
  "찌그러짐": "dent",
};

/** Map Encar's Korean panel-status title to a stable enum we can localise. */
export function panelStatusFromKorean(title: string | null | undefined): PanelStatusKey {
  if (!title) return "unknown";
  const trimmed = String(title).trim();
  for (const [k, v] of Object.entries(PANEL_STATUS_BY_KOREAN)) {
    if (trimmed.includes(k)) return v;
  }
  return "unknown";
}
