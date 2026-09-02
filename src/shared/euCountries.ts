// Dutch names of the 27 EU member states, plus a couple of very common alternate spellings people
// actually type (accents are optional here — normalize() below strips them before matching).
const EU_COUNTRY_NAMES = [
  'oostenrijk',
  'belgie',
  'bulgarije',
  'kroatie',
  'cyprus',
  'tsjechie',
  'tsjechische republiek',
  'denemarken',
  'estland',
  'finland',
  'frankrijk',
  'duitsland',
  'griekenland',
  'hongarije',
  'ierland',
  'italie',
  'letland',
  'litouwen',
  'luxemburg',
  'malta',
  'nederland',
  'nederlandse',
  'nederlands',
  'nl',
  'holland',
  'hollandse',
  'hollands',
  'polen',
  'portugal',
  'roemenie',
  'slowakije',
  'slovenie',
  'spanje',
  'zweden'
]

// Not country names, but a Dutch supermarket writes these in "Land van herkomst" to mean exactly
// the same thing as "Nederland" — grown close by rather than imported — so they resolve the same way.
const LOCAL_SYNONYMS = ['lokaal', 'lokale', 'regio', 'regionaal', 'regionale']

// Unicode combining diacritical marks block (U+0300-U+036F) — written as an explicit escape range
// rather than literal characters so the regex itself stays unambiguous to read and edit.
const COMBINING_MARKS = /[̀-ͯ]/g

function normalize(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(COMBINING_MARKS, '')
}

const EU_COUNTRY_SET = new Set([...EU_COUNTRY_NAMES, ...LOCAL_SYNONYMS].map(normalize))

/** Binding-key label for the derived EU/non-EU field (see mergeProductRow.ts) — not a stored Product
 * field, so it lives here rather than in PRODUCT_FIELD_LABELS. */
export const EU_STATUS_LABEL = 'EU/Niet-EU'

/** 'EU' or 'Niet-EU' for a recognized Dutch country name, or '' when the name isn't recognized —
 * an unrecognized country renders blank (same as any other unresolved bound field) rather than
 * risking a confidently wrong origin label. Recognizes the country not just as the WHOLE field value
 * but also as one dash/comma/slash-separated segment of it, since "Land van herkomst" is often typed
 * as "<plaats> - <land>" (e.g. "Terwolde - NL") — splitting only on that punctuation (not on every
 * space) keeps multi-word names like "Tsjechische republiek" intact as a single segment. */
export function deriveEuStatus(countryName: string): string {
  const normalized = normalize(countryName)
  if (!normalized) return ''
  if (EU_COUNTRY_SET.has(normalized)) return 'EU'
  const segments = countryName.split(/[-,/|;()]+/).map(normalize).filter(Boolean)
  return segments.some((segment) => EU_COUNTRY_SET.has(segment)) ? 'EU' : 'Niet-EU'
}

/** Binding-key label for the fuller "EU landbouw"/"Niet-EU landbouw" phrase some card designs need
 * for produce labeling, as opposed to the bare EU_STATUS_LABEL category — see deriveEuStatusLandbouw. */
export const EU_STATUS_LANDBOUW_LABEL = 'EU/Niet-EU landbouw'

/** 'EU landbouw' or 'Niet-EU landbouw' for a recognized country, or '' when unrecognized — same
 * recognition as deriveEuStatus, just phrased as the full label produce packaging needs to show, so a
 * design can bind directly to this instead of combining EU_STATUS_LABEL with separate static text.
 * Capitalized "Niet-EU" to match EU_STATUS_LABEL's existing convention throughout the app. */
export function deriveEuStatusLandbouw(countryName: string): string {
  const status = deriveEuStatus(countryName)
  return status ? `${status} landbouw` : ''
}
