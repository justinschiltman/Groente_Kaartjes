export function formatCurrencyNl(value: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value)
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
