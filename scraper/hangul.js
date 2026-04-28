/**
 * Hangul (Korean syllables) -> Latin transliteration.
 *
 * Used as the LAST-RESORT fallback after the dictionary in translations.js
 * has had a go. The dictionary handles loanwords correctly (마칸 → Macan,
 * 카이엔 → Cayenne); this module covers the long tail so no Hangul ever
 * reaches the database.
 *
 * Implements a simplified Revised Romanization of Korean: each modern
 * pre-composed syllable in U+AC00..U+D7A3 decomposes into
 *   initial consonant (choseong) + vowel (jungseong) + optional final (jongseong)
 * and we look up Latin substitutes per row.
 *
 * For non-Hangul characters: passthrough.
 *
 * It's deliberately not perfect — for known names you should prefer adding
 * an entry to translations.js. This is the "don't ship Korean" guard.
 */

// 19 leading consonants
const INITIAL = [
  'g',  'kk', 'n',  'd',  'tt', 'r',  'm',  'b',  'pp', 's',
  'ss', '',   'j',  'jj', 'ch', 'k',  't',  'p',  'h',
];

// 21 medials (vowels)
const MEDIAL = [
  'a',  'ae', 'ya', 'yae','eo', 'e',  'yeo','ye', 'o',  'wa',
  'wae','oe', 'yo', 'u',  'wo', 'we', 'wi', 'yu', 'eu', 'ui',
  'i',
];

// 28 finals (index 0 = no final)
const FINAL = [
  '',   'k',  'kk', 'ks', 'n',  'nj', 'nh', 't',  'l',  'lk',
  'lm', 'lp', 'ls', 'lt', 'lp', 'lh', 'm',  'p',  'ps', 't',
  't',  'ng', 'j',  't',  'ch', 'k',  't',  'p',  'h',
];

const HANGUL_BASE = 0xAC00;
const HANGUL_END = 0xD7A3;

const HANGUL_REGEX = /[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7A3]/;

/** True if any character in the string is Hangul. */
function containsHangul(input) {
  return typeof input === 'string' && HANGUL_REGEX.test(input);
}

/**
 * Transliterate Hangul syllables in a string to Latin equivalents.
 * Non-Hangul characters pass through unchanged.
 */
function transliterate(input) {
  if (!input) return input;
  let out = '';
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
  // Capitalize each Latin "word" so transliterated chunks look like
  // proper nouns (these are usually model/trim names).
  return out
    .replace(/\b([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { transliterate, containsHangul };
