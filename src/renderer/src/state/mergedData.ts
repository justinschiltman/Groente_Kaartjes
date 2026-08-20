import { mergeProductIntoRow } from '@shared/mergeProductRow'
import { PRODUCT_FIELD_LABELS } from '@shared/types/product'
import type { DataRow } from '@shared/types/data'
import { useDataStore } from './dataStore'
import { useProductStore } from './productStore'
import { useProjectStore } from './projectStore'

const PRODUCT_FIELD_ORDER = [
  PRODUCT_FIELD_LABELS.name,
  PRODUCT_FIELD_LABELS.orderNumber,
  PRODUCT_FIELD_LABELS.text1,
  PRODUCT_FIELD_LABELS.text2,
  PRODUCT_FIELD_LABELS.countryOfOrigin,
  PRODUCT_FIELD_LABELS.soldPer
]

/** Every field a card element (or a rule's trigger) can bind to: the product database's fields first,
 * then whatever else the imported Excel sheet has (deduplicated on name). Product fields are always
 * listed, even with an empty product catalog, so templates can be designed before products are entered. */
export function useAvailableFields(): string[] {
  const headers = useDataStore((state) => state.headers)
  const extra = headers.filter((h) => !PRODUCT_FIELD_ORDER.includes(h))
  return [...PRODUCT_FIELD_ORDER, ...extra]
}

/** Merges the current product catalog into a row using the project's configured order-number column.
 * Plain function (not a hook) — safe to call from imperative code (Fabric event handlers, export). */
export function mergeCurrentProducts(row: DataRow): DataRow {
  const { orderNumberField } = useProjectStore.getState()
  const { products } = useProductStore.getState()
  return mergeProductIntoRow(row, orderNumberField, products)
}
