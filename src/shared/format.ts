export function formatCurrencyNl(value: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value)
}

/** Parses a number typed with either "," or "." as the decimal separator — people reach for either
 * one without thinking about it, so both must produce the same value. Takes the LAST "," or "." in
 * the string as the decimal point and strips any earlier ones (treated as thousands separators), so
 * "22,90", "22.90" and "1.234,56" all parse the same way regardless of which one was meant as "the
 * comma". Returns null for empty/unparseable input, letting the caller decide the fallback. */
export function parseDecimalNl(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const lastSeparator = Math.max(trimmed.lastIndexOf('.'), trimmed.lastIndexOf(','))
  const normalized =
    lastSeparator === -1
      ? trimmed
      : `${trimmed.slice(0, lastSeparator).replace(/[.,]/g, '')}.${trimmed.slice(lastSeparator + 1)}`
  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? null : parsed
}

export function formatNumberNl(value: number): string {
  return new Intl.NumberFormat('nl-NL').format(value)
}

/** Splits a price into its whole-euro and cents parts (e.g. 2.99 -> "2" / "99"), so a design can show
 * a large whole number with small cents next to it instead of one plain "€ 2,99" string. Rounds to
 * whole cents first to avoid float noise (2.9 -> "2"/"90", not "2"/"9"). */
export function splitCurrencyParts(value: number): { whole: string; cents: string } {
  const totalCents = Math.round(value * 100)
  const whole = Math.trunc(totalCents / 100)
  const cents = Math.abs(totalCents % 100)
  return { whole: String(whole), cents: String(cents).padStart(2, '0') }
}

/** The two binding-key labels a numeric field "X" gets alongside itself (see mergeProductRow.ts and
 * mergedData.ts's useAvailableFields, which must both derive the exact same labels for a binding to
 * actually resolve). */
export function currencySplitLabels(fieldLabel: string): { whole: string; cents: string } {
  return { whole: `${fieldLabel} (hele euro's)`, cents: `${fieldLabel} (centen)` }
}
