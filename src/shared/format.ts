export function formatCurrencyNl(value: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value)
}

export function formatNumberNl(value: number): string {
  return new Intl.NumberFormat('nl-NL').format(value)
}
