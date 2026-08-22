import { deriveEuStatus, EU_STATUS_LABEL } from './euCountries'
import { currencySplitLabels, splitCurrencyParts } from './format'
import { PRODUCT_FIELD_LABELS } from './types/product'
import type { Product } from './types/product'
import type { DataRow } from './types/data'

export const PRICE_PER_KG_LABEL = 'Prijs per kilo'

/** text1/text2 were labeled "Tekst 1"/"Tekst 2" before they became "Top tekst"/"Tekst onder" —
 * existing card elements may still have a bindingKey pointing at the old label, so the row below also
 * carries the same values under these for backward compatibility. */
const LEGACY_TEXT_LABELS = { text1: 'Tekst 1', text2: 'Tekst 2' } as const

const BOOLEAN_LABELS = { true: 'Ja', false: 'Nee' }

/**
 * Turns a product into the field-labeled row shape that bindingKey/resolveBoundText/the rule engine
 * all read from — the single source every card design and export ultimately binds against, regardless
 * of which product field actually backs a given label (a stable value like Naam, a weekly one like
 * Prijs per kilo, or a derived one like EU/Niet-EU).
 */
export function productToRow(product: Product): DataRow {
  const row: DataRow = {
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
    [PRODUCT_FIELD_LABELS.isPromotion]: product.isPromotion ? BOOLEAN_LABELS.true : BOOLEAN_LABELS.false,
    [PRODUCT_FIELD_LABELS.soldByWeight]: product.soldByWeight ? BOOLEAN_LABELS.true : BOOLEAN_LABELS.false,
    [PRICE_PER_KG_LABEL]: product.pricePerKg
  }
  if (product.pricePerKg !== null) {
    const { whole, cents } = currencySplitLabels(PRICE_PER_KG_LABEL)
    const parts = splitCurrencyParts(product.pricePerKg)
    row[whole] = parts.whole
    row[cents] = parts.cents
  }
  return row
}
