/**
 * Hangul (Korean syllables) → Latin transliteration.
 *
 * TypeScript port of scraper/hangul.js. Used as the LAST-RESORT fallback
 * after the dictionary in src/lib/translate.ts has had a go. Implements
 * a simplified Revised Romanization of Korean — pre-composed syllables
 * in U+AC00..U+D7A3 decompose into initial + medial + final, each
 * mapped to Latin substitutes.
 */

const INITIAL = [
  "g",  "kk", "n",  "d",  "tt", "r",  "m",  "b",  "pp", "s",
  "ss", "",   "j",  "jj", "ch", "k",  "t",  "p",  "h",
];

const MEDIAL = [
  "a",   "ae", "ya", "yae", "eo", "e",   "yeo", "ye", "o",  "wa",
  "wae", "oe", "yo", "u",   "wo", "we",  "wi",  "yu", "eu", "ui",
  "i",
];

const FINAL = [
  "",   "k",  "kk", "ks", "n",  "nj", "nh", "t",  "l",  "lk",
  "lm", "lp", "ls", "lt", "lp", "lh", "m",  "p",  "ps", "t",
  "t",  "ng", "j",  "t",  "ch", "k",  "t",  "p",  "h",
];

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;

const HANGUL_REGEX = /[\u1100-\u11ff\u3130-\u318f\uA960-\uA97F\uAC00-\uD7A3]/;

/** Return true if the string contains any Hangul character. */
export function containsHangul(input: string | null | undefined): boolean {
  return typeof input === "string" && HANGUL_REGEX.test(input);
}

/**
 * Transliterate Hangul syllables to Latin. Non-Hangul characters pass
 * through unchanged. Output is title-cased on word boundaries so the
 * result reads like a proper-noun romanization.
 */
export function transliterate(input: string): string {
  if (!input) return input;
  let out = "";
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code < HANGUL_BASE || code > HANGUL_END) {
      out += input[i];
      continue;
    }
    const syllableIndex = code - HANGUL_BASE;
    const finalIdx = syllableIndex % 28;
    const medialIdx = Math.floor(syllableIndex / 28) % 21;
    const initialIdx = Math.floor(syllableIndex / (28 * 21));
    out += INITIAL[initialIdx] + MEDIAL[medialIdx] + FINAL[finalIdx];
  }
  return out
    .replace(/\b([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}
