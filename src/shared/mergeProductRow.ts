import { deriveEuStatusLandbouw, EU_STATUS_LABEL, EU_STATUS_LANDBOUW_LABEL } from './euCountries'
import { currencySplitLabels, formatCurrencyNl, splitCurrencyParts } from './format'
import { PRODUCT_FIELD_LABELS } from './types/product'
import type { Product } from './types/product'
import type { DataRow } from './types/data'

/** Always pre-formatted with its unit, e.g. "€ 22,90 kg" — this used to be the raw number (requiring a
 * separate Opmaak: Bedrag (€) step to read correctly, and even then never showing "kg"), and a design
 * bound to it kept showing a bare "22.9". A raw-number sibling field was tried too ("Prijs per kilo
 * (met eenheid)") but that just meant picking the wrong one reproduced the same bug — so this label
 * itself now always resolves fully formatted, and there's only the one field. The whole-euro/cents
 * split fields below are unaffected: they read product.pricePerKg directly, not this row value. */
export const PRICE_PER_KG_LABEL = 'Prijs per kilo'
/** The portion weight as display text (e.g. "250 gram") — see Product.weightGrams. */
export const WEIGHT_GRAMS_LABEL = 'Gewicht (gram)'
/** The computed price for one portion: pricePerKg / 1000 * weightGrams, formatted as "€ 1,49". */
export const PORTION_PRICE_LABEL = 'Prijs bij dit gewicht'

/** text1/text2 were labeled "Tekst 1"/"Tekst 2" before they became "Top tekst"/"Tekst onder" —
 * existing card elements may still have a bindingKey pointing at the old label, so the row below also
 * carries the same values under these for backward compatibility. */
export const LEGACY_TEXT_LABELS = { text1: 'Tekst 1', text2: 'Tekst 2' } as const

/** EU_STATUS_LABEL ("EU/Niet-EU") used to carry the bare category — that was confusing next to
 * EU_STATUS_LANDBOUW_LABEL's fuller phrase, and no design ever actually wanted the bare version, so
 * it's no longer offered in the field picker (see mergedData.ts's AVAILABLE_FIELDS). It's still
 * populated here, with the SAME full-phrase value as EU_STATUS_LANDBOUW_LABEL, purely so any element
 * still bound to the old label keeps resolving — and now shows the better phrasing too. */

const BOOLEAN_LABELS = { true: 'Ja', false: 'Nee' }

/** Derives "Verkocht per" straight from soldByWeight/weightGrams — "per stuk" when sold by piece,
 * "per 250 gram" (etc.) once a weight-sold product's amount is filled in, or null while it isn't yet.
 * Used both for the actual card-bound value (productToRow) and for the read-only preview shown next to
 * the Gewicht column in ProductsPage, so the two can never drift apart. */
export function deriveSoldPer(product: Pick<Product, 'soldByWeight' | 'weightGrams'>): string | null {
  if (!product.soldByWeight) return 'per stuk'
  return product.weightGrams !== null ? `per ${product.weightGrams} gram` : null
}

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
    // Derived from soldByWeight/weightGrams rather than product.soldPer (a manually-typed field that
    // used to require re-typing "per stuk"/"per 250 gram" on every single product) — soldByWeight
    // already says whether it's sold loose by weight or per piece, and weightGrams already says how
    // much, so the correct phrasing here was always fully implied by those two, never a separate fact.
    [PRODUCT_FIELD_LABELS.soldPer]: deriveSoldPer(product),
    [EU_STATUS_LABEL]: deriveEuStatusLandbouw(product.countryOfOrigin.favorite) || null,
    [EU_STATUS_LANDBOUW_LABEL]: deriveEuStatusLandbouw(product.countryOfOrigin.favorite) || null,
    [PRODUCT_FIELD_LABELS.isPromotion]: product.isPromotion ? BOOLEAN_LABELS.true : BOOLEAN_LABELS.false,
    [PRODUCT_FIELD_LABELS.soldByWeight]: product.soldByWeight ? BOOLEAN_LABELS.true : BOOLEAN_LABELS.false,
    [PRICE_PER_KG_LABEL]: product.pricePerKg === null ? null : `${formatCurrencyNl(product.pricePerKg)} kg`
  }
  if (product.pricePerKg !== null) {
    const { whole, cents } = currencySplitLabels(PRICE_PER_KG_LABEL)
    const parts = splitCurrencyParts(product.pricePerKg)
    row[whole] = parts.whole
    row[cents] = parts.cents
  }
  // weightGrams only means anything while soldByWeight is true — gating here means a stale gram
  // amount left over from a previous week never resurfaces on a card that's now sold per piece.
  if (product.soldByWeight && product.weightGrams !== null) {
    row[WEIGHT_GRAMS_LABEL] = `${product.weightGrams} gram`
    if (product.pricePerKg !== null) {
      const portionPrice = (product.pricePerKg / 1000) * product.weightGrams
      row[PORTION_PRICE_LABEL] = formatCurrencyNl(portionPrice)
      // Same big-euros/small-cents split already offered for Prijs per kilo (see currencySplitLabels),
      // so a "€22,90"-style big-digit price design can use the portion price too, not just the per-kilo one.
      const { whole, cents } = currencySplitLabels(PORTION_PRICE_LABEL)
      const parts = splitCurrencyParts(portionPrice)
      row[whole] = parts.whole
      row[cents] = parts.cents
    }
  }
  return row
}
