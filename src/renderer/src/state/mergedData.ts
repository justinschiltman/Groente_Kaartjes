import { EU_STATUS_LABEL } from '@shared/euCountries'
import { currencySplitLabels } from '@shared/format'
import { mergeProductIntoRow } from '@shared/mergeProductRow'
import { PRODUCT_FIELD_LABELS } from '@shared/types/product'
import type { DataRow } from '@shared/types/data'
import { useDataStore } from './dataStore'
import { useProductStore } from './productStore'
import { useProjectStore } from './projectStore'

// The legacy "Tekst 1"/"Tekst 2" aliases (see mergeProductRow.ts) are deliberately left out here —
// they still resolve for designs bound to them, but new bindings should only ever pick the current
// "Top tekst"/"Tekst onder" labels.
const PRODUCT_FIELD_ORDER = [
  PRODUCT_FIELD_LABELS.name,
  PRODUCT_FIELD_LABELS.orderNumber,
  PRODUCT_FIELD_LABELS.scaleCode,
  PRODUCT_FIELD_LABELS.text1,
  PRODUCT_FIELD_LABELS.text2,
  PRODUCT_FIELD_LABELS.countryOfOrigin,
  PRODUCT_FIELD_LABELS.soldPer,
  EU_STATUS_LABEL
]

/** Every field a card element (or a rule's trigger) can bind to: the product database's fields first,
 * then whatever else the imported Excel sheet has (deduplicated on name). Product fields are always
 * listed, even with an empty product catalog, so templates can be designed before products are entered.
 * A numeric Excel column (checked against its actual imported values, since headers alone don't carry
 * a type) also lists its whole-euro/cents parts right next to it — see mergeProductRow.ts, which is
 * what actually resolves those two extra labels for a bound element. */
export function useAvailableFields(): string[] {
  const headers = useDataStore((state) => state.headers)
  const rows = useDataStore((state) => state.rows)
  const extra = headers.filter((h) => !PRODUCT_FIELD_ORDER.includes(h))
  const withSplits = extra.flatMap((header) => {
    const isNumeric = rows.some((row) => typeof row[header] === 'number')
    if (!isNumeric) return [header]
    const { whole, cents } = currencySplitLabels(header)
    return [header, whole, cents]
  })
  return [...PRODUCT_FIELD_ORDER, ...withSplits]
}

/** Merges the current product catalog into a row using the project's configured order-number column.
 * Plain function (not a hook) — safe to call from imperative code (Fabric event handlers, export). */
export function mergeCurrentProducts(row: DataRow): DataRow {
  const { orderNumberField } = useProjectStore.getState()
  const { products } = useProductStore.getState()
  return mergeProductIntoRow(row, orderNumberField, products)
}
