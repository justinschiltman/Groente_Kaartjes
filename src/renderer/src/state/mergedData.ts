import { EU_STATUS_LABEL } from '@shared/euCountries'
import { currencySplitLabels } from '@shared/format'
import { mergeProductIntoRow } from '@shared/mergeProductRow'
import { PRODUCT_FIELD_LABELS } from '@shared/types/product'
import type { DataRow } from '@shared/types/data'
import { ALWAYS_AVAILABLE_WEEKLY_LABELS, PRICE_PER_KG_LABEL } from '@shared/weeklyFields'
import { useDataStore } from './dataStore'
import { useProductStore } from './productStore'
import { useProjectStore } from './projectStore'

// The legacy "Tekst 1"/"Tekst 2" aliases (see mergeProductRow.ts) are deliberately left out here —
// they still resolve for designs bound to them, but new bindings should only ever pick the current
// "Top tekst"/"Tekst onder" labels.
//
// Prijs per kilo's whole-euro/cents parts are listed unconditionally alongside it (unlike a generic
// imported column's split parts below, which only show up once we've actually seen a numeric value)
// since we already know this one's a price no matter what's been imported yet — see weeklyFields.ts.
const PRICE_SPLIT_LABELS = currencySplitLabels(PRICE_PER_KG_LABEL)
const ALWAYS_AVAILABLE_FIELDS = [
  PRODUCT_FIELD_LABELS.name,
  PRODUCT_FIELD_LABELS.orderNumber,
  PRODUCT_FIELD_LABELS.scaleCode,
  PRODUCT_FIELD_LABELS.text1,
  PRODUCT_FIELD_LABELS.text2,
  PRODUCT_FIELD_LABELS.countryOfOrigin,
  PRODUCT_FIELD_LABELS.soldPer,
  EU_STATUS_LABEL,
  ...ALWAYS_AVAILABLE_WEEKLY_LABELS,
  PRICE_SPLIT_LABELS.whole,
  PRICE_SPLIT_LABELS.cents
]

/** Every field a card element (or a rule's trigger) can bind to. Product fields and the known weekly
 * fields (Prijs per kilo, Per gewicht, ...) are always listed — regardless of whether a product exists
 * or a sheet has been imported yet — so a design never depends on import order; see mergeProductRow.ts
 * and weeklyFields.ts for how each one actually gets its value once real data shows up. Any OTHER
 * imported column (not one of the known/aliased ones) is listed too once its sheet is imported, with
 * its own whole-euro/cents parts alongside it if its actual values turn out to be numeric. */
export function useAvailableFields(): string[] {
  const headers = useDataStore((state) => state.headers)
  const rows = useDataStore((state) => state.rows)
  const extra = headers.filter((h) => !ALWAYS_AVAILABLE_FIELDS.includes(h))
  const withSplits = extra.flatMap((header) => {
    const isNumeric = rows.some((row) => typeof row[header] === 'number')
    if (!isNumeric) return [header]
    const { whole, cents } = currencySplitLabels(header)
    return [header, whole, cents]
  })
  return [...ALWAYS_AVAILABLE_FIELDS, ...withSplits]
}

/** Merges the current product catalog into a row using the project's configured order-number column.
 * Plain function (not a hook) — safe to call from imperative code (Fabric event handlers, export). */
export function mergeCurrentProducts(row: DataRow): DataRow {
  const { orderNumberField } = useProjectStore.getState()
  const { products } = useProductStore.getState()
  return mergeProductIntoRow(row, orderNumberField, products)
}
