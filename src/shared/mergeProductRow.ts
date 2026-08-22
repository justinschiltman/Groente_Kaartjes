import { deriveEuStatus, EU_STATUS_LABEL } from './euCountries'
import { PRODUCT_FIELD_LABELS } from './types/product'
import type { Product } from './types/product'
import type { DataRow } from './types/data'

/** text1/text2 were labeled "Tekst 1"/"Tekst 2" before they became "Top tekst"/"Tekst onder" —
 * existing card elements may still have a bindingKey pointing at the old label, so the merged row
 * below also carries the same values under these for backward compatibility. */
const LEGACY_TEXT_LABELS = { text1: 'Tekst 1', text2: 'Tekst 2' } as const

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/** Finds the product whose orderNumber matches the row's value in orderNumberField
 * (case/whitespace-insensitive). Returns undefined when unconfigured or unmatched. */
export function findMatchingProduct(row: DataRow, orderNumberField: string | null, products: Product[]): Product | undefined {
  if (!orderNumberField) return undefined
  const raw = row[orderNumberField]
  if (raw === null || raw === undefined) return undefined
  const rawNormalized = normalize(String(raw))
  return products.find((p) => normalize(p.orderNumber) === rawNormalized)
}

/**
 * Combines a product's fields (using each multi-value field's current favorite) with an imported
 * Excel row into one DataRow-shaped object, so bindingKey/resolveBoundText/ruleEngine/export all keep
 * working unchanged against a plain row — they don't need to know products exist at all. Excel columns
 * win on a literal name collision, though a successfully matched row's own values should already agree.
 * Falls back to the row unchanged when there's no matching product (bound product fields then simply
 * resolve blank, same as any other unbound/missing column).
 */
export function mergeProductIntoRow(row: DataRow, orderNumberField: string | null, products: Product[]): DataRow {
  const product = findMatchingProduct(row, orderNumberField, products)
  if (!product) return row
  return {
    [PRODUCT_FIELD_LABELS.name]: product.name || null,
    [PRODUCT_FIELD_LABELS.orderNumber]: product.orderNumber || null,
    [PRODUCT_FIELD_LABELS.scaleCode]: product.scaleCode || null,
    [PRODUCT_FIELD_LABELS.text1]: product.text1.favorite || null,
    [PRODUCT_FIELD_LABELS.text2]: product.text2.favorite || null,
    [LEGACY_TEXT_LABELS.text1]: product.text1.favorite || null,
    [LEGACY_TEXT_LABELS.text2]: product.text2.favorite || null,
    [PRODUCT_FIELD_LABELS.countryOfOrigin]: product.countryOfOrigin.favorite || null,
    [PRODUCT_FIELD_LABELS.soldPer]: product.soldPer.favorite || null,
    [EU_STATUS_LABEL]: deriveEuStatus(product.countryOfOrigin.favorite) || null,
    ...row
  }
}
