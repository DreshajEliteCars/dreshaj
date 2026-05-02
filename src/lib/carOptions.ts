/**
 * Encar standard-equipment option dictionary.
 *
 * The codes (e.g. "014", "035") come from `detail.options.standard` on
 * Encar's per-vehicle endpoint. Encar doesn't ship an authoritative
 * dictionary at any documented URL, so this map is pieced together from
 * what we observe in real listings + community-known mappings. If a code
 * looks wrong on a particular car, fix the entry here and reload — no
 * backend changes needed since the codes are stored as-is in the DB.
 *
 * Each entry has:
 *   - sq, en   localized labels (used by useLanguage's `lang` value)
 *   - icon     a key into ICONS below; controls which SVG renders
 *
 * Unknown codes fall back to "Option XXX" rather than guessing.
 */

export type OptionIconKey =
  | "sun"
  | "moon"
  | "lightbulb"
  | "fog"
  | "car"
  | "key"
  | "power"
  | "armchair"
  | "flame"
  | "wind"
  | "snowflake"
  | "gauge"
  | "route"
  | "eye"
  | "shield"
  | "alert"
  | "camera"
  | "parking"
  | "monitor"
  | "map"
  | "music"
  | "phone"
  | "battery"
  | "wheel"
  | "rain"
  | "navigation"
  | "settings";

export type OptionMeta = {
  sq: string;
  en: string;
  icon: OptionIconKey;
};

// Best-effort mapping. Most-confident entries first, weaker guesses
// further down. Feel free to extend.
export const OPTION_DICTIONARY: Record<string, OptionMeta> = {
  // Based on Encar's actual standard option IDs
  "001": { sq: "Fenerë të ndritshëm / ABS", en: "Headlamps / ABS", icon: "lightbulb" },
  "002": { sq: "Airbag / ECS", en: "Airbags / ECS", icon: "shield" },
  "003": { sq: "Sensorë parkimi / CD", en: "Parking sensors / CD player", icon: "parking" },
  "004": { sq: "Pilot automatik / Ekran", en: "Cruise control / Front AV", icon: "gauge" },
  "005": { sq: "Navigim / Perde dielli", en: "Navigation / Curtains", icon: "navigation" },
  "006": { sq: "Sedilje elektrike / Mbyllje", en: "Power seats / Door locks", icon: "armchair" },
  "007": { sq: "Sedilje me ngrohje / Xhama", en: "Heated seats / Power windows", icon: "flame" },
  "008": { sq: "Sedilje me memorie / Timon", en: "Memory seats / Power steering", icon: "armchair" },
  "009": { sq: "Sedilje me ajrosje", en: "Ventilated seats", icon: "wind" },
  "010": { sq: "Sunroof", en: "Sunroof", icon: "sun" },
  
  "014": { sq: "Sedilje lëkure", en: "Leather seats", icon: "armchair" },
  "015": { sq: "Hapje pa çelës", en: "Keyless entry", icon: "key" },
  "017": { sq: "Disqe alumini", en: "Alloy wheels", icon: "wheel" },
  "019": { sq: "Sistemi kundër rrëshqitjes (TCS)", en: "Traction control (TCS)", icon: "shield" },
  
  "020": { sq: "Airbag anësor", en: "Side airbags", icon: "shield" },
  "021": { sq: "Sedilja e shoferit elektrike", en: "Power driver seat", icon: "armchair" },
  "022": { sq: "Sediljet para me ngrohje", en: "Heated front seats", icon: "flame" },
  "023": { sq: "Klima automatike", en: "Automatic climate control", icon: "snowflake" },
  "024": { sq: "Pasqyra elektrike me palosje", en: "Power folding mirrors", icon: "car" },
  "026": { sq: "Airbag shoferi", en: "Driver airbag", icon: "shield" },
  "027": { sq: "Airbag pasagjeri", en: "Passenger airbag", icon: "shield" },
  "029": { sq: "Fenerë HID", en: "HID headlamps", icon: "lightbulb" },
  
  "030": { sq: "Pasqyrë e brendshme anti-verbuese", en: "Auto-dimming mirror", icon: "eye" },
  "031": { sq: "Komanda në timon", en: "Steering wheel controls", icon: "settings" },
  "032": { sq: "Sensorë parkimi mbrapa", en: "Rear parking sensors", icon: "parking" },
  "033": { sq: "Sensor presioni gomash (TPMS)", en: "Tire pressure monitoring", icon: "alert" },
  "034": { sq: "Sedilja e shoferit me ajrosje", en: "Ventilated driver seat", icon: "wind" },
  "035": { sq: "Sedilja e pasagjerit elektrike", en: "Power passenger seat", icon: "armchair" },
  
  "051": { sq: "Sedilja e shoferit me memorie", en: "Memory driver seat", icon: "armchair" },
  "054": { sq: "Monitori i pasmë AV", en: "Rear entertainment system", icon: "monitor" },
  "055": { sq: "Kontrolli i stabilitetit (ESC)", en: "Electronic stability control", icon: "shield" },
  "056": { sq: "Airbag perde", en: "Curtain airbags", icon: "shield" },
  "057": { sq: "Çelës inteligjent", en: "Smart key", icon: "key" },
  "058": { sq: "Kamera parkimi mbrapa", en: "Rear view camera", icon: "camera" },
  "059": { sq: "Bagazh elektrik", en: "Power trunk", icon: "power" },
  
  "062": { sq: "Bagażier çatie", en: "Roof rack", icon: "car" },
  "063": { sq: "Sediljet mbrapa me ngrohje", en: "Heated rear seats", icon: "flame" },
  "068": { sq: "Pilot automatik", en: "Cruise control", icon: "gauge" },
  
  "071": { sq: "Hyrje AUX", en: "AUX port", icon: "music" },
  "072": { sq: "Hyrje USB", en: "USB port", icon: "phone" },
  "074": { sq: "Sistem Hi-pass", en: "Hi-pass system", icon: "route" },
  "075": { sq: "Fenerë LED", en: "LED headlamps", icon: "lightbulb" },
  "077": { sq: "Sedilja e pasagjerit me ajrosje", en: "Ventilated passenger seat", icon: "wind" },
  "078": { sq: "Sedilja e pasagjerit me memorie", en: "Memory passenger seat", icon: "armchair" },
  "079": { sq: "Pilot automatik adaptiv", en: "Adaptive cruise control", icon: "gauge" },
  
  "080": { sq: "Mbyllje me thithje e dyerve", en: "Soft-close doors", icon: "car" },
  "081": { sq: "Sensori i shiut", en: "Rain sensor wipers", icon: "rain" },
  "082": { sq: "Timoni me ngrohje", en: "Heated steering wheel", icon: "flame" },
  "083": { sq: "Timoni me rregullim elektrik", en: "Power steering column", icon: "settings" },
  "084": { sq: "Marshe në timon", en: "Paddle shifters", icon: "settings" },
  "085": { sq: "Sensorë parkimi para", en: "Front parking sensors", icon: "parking" },
  "086": { sq: "Monitorues i pikës së verbër", en: "Blind spot monitoring", icon: "eye" },
  "087": { sq: "Kamera 360 gradë", en: "360-degree camera", icon: "camera" },
  "088": { sq: "Asistencë për mbajtjen e korsisë", en: "Lane departure warning", icon: "route" },
  "089": { sq: "Sedilje të pasme elektrike", en: "Power rear seats", icon: "armchair" },
  
  "090": { sq: "Sediljet e pasme me ajrosje", en: "Ventilated rear seats", icon: "wind" },
  "091": { sq: "Sedilje me masazh", en: "Massage seats", icon: "armchair" },
  "092": { sq: "Perde dielli për pasagjerët", en: "Rear sunshades", icon: "car" },
  "093": { sq: "Perde dielli e pasme", en: "Back sunshade", icon: "car" },
  "094": { sq: "Frena dore elektrike", en: "Electronic parking brake", icon: "power" },
  "095": { sq: "Tregues në xham (HUD)", en: "Head-up display", icon: "monitor" },
  "096": { sq: "Bluetooth", en: "Bluetooth", icon: "phone" },
  "097": { sq: "Drita automatike", en: "Auto headlights", icon: "lightbulb" },
};

export function getOptionMeta(code: string): OptionMeta | null {
  return OPTION_DICTIONARY[code] ?? null;
}

export function getOptionLabel(code: string, lang: "sq" | "en" = "sq"): string {
  const meta = OPTION_DICTIONARY[code];
  if (!meta) return `Option ${code}`;
  return meta[lang];
}
