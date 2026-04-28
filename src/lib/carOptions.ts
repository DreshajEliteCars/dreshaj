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
  // 001-019 — interior comfort
  "001": { sq: "Sunroof", en: "Sunroof", icon: "sun" },
  "002": { sq: "Sunroof panoramik", en: "Panoramic sunroof", icon: "sun" },
  "003": { sq: "Sediljet e lëkurës", en: "Leather seats", icon: "armchair" },
  "004": { sq: "Sediljet me memorie", en: "Memory seats", icon: "armchair" },
  "005": { sq: "Sediljet elektrike", en: "Power seats", icon: "armchair" },
  "006": { sq: "Sediljet me ngrohje", en: "Heated seats", icon: "flame" },
  "007": { sq: "Sediljet me ajrosje", en: "Ventilated seats", icon: "wind" },
  "008": { sq: "Timoni me ngrohje", en: "Heated steering wheel", icon: "flame" },
  "009": { sq: "Pasqyra me ngrohje", en: "Heated mirrors", icon: "flame" },
  "010": { sq: "Çelës smart", en: "Smart key", icon: "key" },
  "011": { sq: "Ndezje me buton", en: "Push start", icon: "power" },
  "012": { sq: "Klimatizim manual", en: "Air conditioning", icon: "snowflake" },
  "013": { sq: "Klimatizim automatik", en: "Automatic air conditioner", icon: "snowflake" },
  "014": { sq: "Klimatizim dy-zonal", en: "Dual-zone climate", icon: "snowflake" },
  "015": { sq: "Navigim", en: "Navigation", icon: "navigation" },
  "016": { sq: "Bluetooth", en: "Bluetooth", icon: "phone" },
  "017": { sq: "Drita HID", en: "HID headlamps", icon: "lightbulb" },
  "018": { sq: "Drita LED", en: "LED headlamps", icon: "lightbulb" },
  "019": { sq: "Drita të mjegullës", en: "Fog lamps", icon: "fog" },

  // 020-039 — driver assists, parking, vision
  "020": { sq: "Drita automatike", en: "Auto headlamps", icon: "lightbulb" },
  "021": { sq: "Drita adaptive", en: "Adaptive headlamps", icon: "lightbulb" },
  "022": { sq: "Sensori i shiut", en: "Rain sensor wipers", icon: "rain" },
  "023": { sq: "Cruise control", en: "Cruise control", icon: "gauge" },
  "024": { sq: "Cruise adaptiv", en: "Adaptive cruise control", icon: "gauge" },
  "025": { sq: "Mbajtës korsie", en: "Lane keep assist", icon: "route" },
  "026": { sq: "Monitor i pikës së verbër", en: "Blind spot monitoring", icon: "eye" },
  "027": { sq: "Sensorë parkimi mbrapa", en: "Rear parking sensors", icon: "parking" },
  "028": { sq: "Sensorë parkimi para", en: "Front parking sensors", icon: "parking" },
  "029": { sq: "Kamera mbrapa", en: "Rear camera", icon: "camera" },
  "030": { sq: "Kamera 360°", en: "360° camera", icon: "camera" },
  "031": { sq: "Paralajmërim përplasjeje", en: "Forward collision warning", icon: "alert" },
  "032": { sq: "Frenim automatik emergjent", en: "Automatic emergency braking", icon: "alert" },
  "033": { sq: "Head-up display", en: "Head-up display", icon: "monitor" },
  "034": { sq: "Asistencë parkimi", en: "Parking assist", icon: "parking" },
  "035": { sq: "Sistemi i navigimit", en: "Navigation system", icon: "map" },

  // 040-059 — infotainment, sound
  "040": { sq: "Audio premium", en: "Premium audio", icon: "music" },
  "041": { sq: "Apple CarPlay", en: "Apple CarPlay", icon: "phone" },
  "042": { sq: "Android Auto", en: "Android Auto", icon: "phone" },
  "043": { sq: "USB", en: "USB", icon: "phone" },
  "044": { sq: "Ngarkim wireless", en: "Wireless charging", icon: "battery" },
  "055": { sq: "Sensor distance", en: "Distance sensor", icon: "gauge" },
  "056": { sq: "ABS", en: "ABS", icon: "shield" },

  // 060-079 — safety
  "060": { sq: "Airbag drejtuesi", en: "Driver airbag", icon: "shield" },
  "061": { sq: "Airbag pasagjeri", en: "Passenger airbag", icon: "shield" },
  "062": { sq: "Airbag anësore", en: "Side airbags", icon: "shield" },
  "063": { sq: "Airbag perde", en: "Curtain airbags", icon: "shield" },
  "064": { sq: "ESP/VDC", en: "Stability control", icon: "shield" },
  "065": { sq: "Kontrolli i tërheqjes", en: "Traction control", icon: "shield" },
  "066": { sq: "Asistencë frenimi", en: "Brake assist", icon: "shield" },
  "068": { sq: "Imobilizues", en: "Immobilizer", icon: "shield" },

  // 080-099 — wheels / drivetrain / misc
  "080": { sq: "AWD/4WD", en: "AWD/4WD", icon: "wheel" },
  "081": { sq: "Susta sportive", en: "Sport suspension", icon: "settings" },
  "082": { sq: "Mode sportiv", en: "Sport mode", icon: "settings" },
  "085": { sq: "Tappe motorike", en: "Power tailgate", icon: "settings" },
};

export function getOptionMeta(code: string): OptionMeta | null {
  return OPTION_DICTIONARY[code] ?? null;
}

export function getOptionLabel(code: string, lang: "sq" | "en" = "sq"): string {
  const meta = OPTION_DICTIONARY[code];
  if (!meta) return `Option ${code}`;
  return meta[lang];
}
