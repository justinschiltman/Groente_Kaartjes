import type { DataRow } from './types/data'

export const PRICE_PER_KG_LABEL = 'Prijs per kilo'
export const SOLD_UNIT_LABEL = 'Per gewicht'

interface AliasedField {
  label: string
  /** Normalized (trim + lowercase) header-name variants that count as a match. */
  aliases: string[]
}

const ALIASED_WEEKLY_FIELDS: AliasedField[] = [
  {
    label: PRICE_PER_KG_LABEL,
    aliases: ['prijs', 'prijs per kilo', 'prijs per kg', 'kiloprijs', 'kilo prijs', 'verkoopprijs', 'adviesprijs']
  },
  {
    label: SOLD_UNIT_LABEL,
    aliases: ['per gewicht', 'verkoopeenheid', 'per stuk of gewicht', 'stuk of gewicht']
  }
]

/** The fixed field labels above, for useAvailableFields — always offered for binding regardless of
 * whether a matching column has actually been imported yet. */
export const ALWAYS_AVAILABLE_WEEKLY_LABELS = ALIASED_WEEKLY_FIELDS.map((f) => f.label)

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Whatever the user happens to name their weekly price/unit columns, this exposes the same values
 * under fixed canonical labels too (e.g. a "Prijs" or "Kiloprijs" column also becomes readable as
 * "Prijs per kilo") — so those fields can be assigned to a design up front and just resolve once a
 * matching column shows up, instead of only existing after that specific week's import. A row that
 * already has the canonical label as a literal column name is left untouched (that column wins).
 */
export function withAliasedWeeklyFields(row: DataRow): DataRow {
  const extra: DataRow = {}
  const headers = Object.keys(row)
  for (const { label, aliases } of ALIASED_WEEKLY_FIELDS) {
    if (label in row) continue
    const matchedHeader = headers.find((h) => aliases.includes(normalize(h)))
    if (matchedHeader !== undefined) extra[label] = row[matchedHeader]
  }
  return { ...row, ...extra }
}
