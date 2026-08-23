/** A field that can hold several saved values (e.g. past phrasings, past countries of origin), one of
 * which is the current favorite — the value actually used when a card is filled in. Options are kept
 * even after a different one becomes favorite, so switching back later doesn't require retyping. */
export interface MultiValueField {
  options: string[]
  /** Always a member of options, or '' when options is empty. */
  favorite: string
}

export function createMultiValueField(initial?: string): MultiValueField {
  const trimmed = initial?.trim()
  return trimmed ? { options: [trimmed], favorite: trimmed } : { options: [], favorite: '' }
}

export interface Product {
  id: string
  name: string
  orderNumber: string
  /** The code entered at the weighing scale for loose produce — always the same value for a given
   * product, like orderNumber, so it's a plain field rather than a MultiValueField. */
  scaleCode: string
  text1: MultiValueField
  text2: MultiValueField
  countryOfOrigin: MultiValueField
  soldPer: MultiValueField
  /** How many cards of this product to generate on the next "Verwerken" — the weekly work list.
   * Reset to 0 (along with pricePerKg/isPromotion/soldByWeight) once those cards are processed, so
   * last week's batch is never accidentally reprinted. */
  quantity: number
  /** Whether this week's card should use a promotion ("actie") design. Along with soldByWeight, this
   * is what a template's triggerConditions match against — see shared/ruleEngine.ts. */
  isPromotion: boolean
  /** Sold by weight (true) vs. per piece (false) this week — the other half of the design trigger,
   * independent of isPromotion (see PRODUCT_FIELD_LABELS.soldByWeight, "Per gewicht"). */
  soldByWeight: boolean
  /** This week's price per kilo, or null when not (yet) set. See format.ts's splitCurrencyParts for
   * how a bound design shows this as one amount, or as separate whole-euro/cents parts. */
  pricePerKg: number | null
  /** The weight of one sold portion in grams (e.g. 100/250/500), only meaningful — and only editable
   * in the UI — while soldByWeight is true. Drives the computed "price at this weight" field in
   * mergeProductRow.ts (pricePerKg / 1000 * weightGrams). Kept even if soldByWeight is later
   * unchecked, same as other week-specific fields, but mergeProductRow.ts only surfaces it while
   * soldByWeight is true so a stale value never leaks onto a per-piece card. */
  weightGrams: number | null
  createdAt: string
  updatedAt: string
}

export function createDefaultProduct(): Product {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: '',
    orderNumber: '',
    scaleCode: '',
    text1: createMultiValueField(),
    text2: createMultiValueField(),
    countryOfOrigin: createMultiValueField(),
    soldPer: createMultiValueField(),
    quantity: 0,
    isPromotion: false,
    soldByWeight: false,
    pricePerKg: null,
    weightGrams: null,
    createdAt: now,
    updatedAt: now
  }
}

/** Field keys that hold several saved options with a favorite, as opposed to name/orderNumber which
 * are always a single plain value. */
export const MULTI_VALUE_FIELDS = ['text1', 'text2', 'countryOfOrigin', 'soldPer'] as const
export type MultiValueFieldKey = (typeof MULTI_VALUE_FIELDS)[number]

/** Dutch labels used both as UI copy and as the binding-key/trigger-condition field names exposed to
 * card designs and rules (see shared/mergeProductRow.ts) — keep in sync with any bindingKey or
 * triggerConditions field stored on existing card elements/templates.
 * text1/text2 were labeled "Tekst 1"/"Tekst 2" before — mergeProductRow.ts still emits the merged
 * row under those old labels too, so existing designs bound to them keep resolving unchanged. */
export const PRODUCT_FIELD_LABELS: Record<
  'name' | 'orderNumber' | 'scaleCode' | 'isPromotion' | 'soldByWeight' | MultiValueFieldKey,
  string
> = {
  name: 'Naam',
  orderNumber: 'Bestelnummer',
  scaleCode: 'Weegschaalcode',
  text1: 'Top tekst',
  text2: 'Tekst onder',
  countryOfOrigin: 'Land van herkomst',
  soldPer: 'Verkocht per',
  isPromotion: 'Actie',
  soldByWeight: 'Per gewicht'
}

/**
 * One row of a bulk product import — parsed in the main process from an Excel sheet, applied in the
 * renderer via productStore.upsertByOrderNumber. Each present field only ever ADDS a saved option (for
 * MultiValueFields) or overwrites the current value (for plain fields); it never removes previously
 * saved alternates. Every row also unconditionally sets quantity to 1 on its matched/created product
 * (see productStore.ts) — importing a sheet means "order one card for everything in it" by default.
 */
export interface ProductImportRow {
  orderNumber: string
  name?: string
  scaleCode?: string
  text1?: string
  text2?: string
  countryOfOrigin?: string
  soldPer?: string
  /** This week's price per kilo, already parsed to a number by the importer. */
  pricePerKg?: number
  isPromotion?: boolean
  soldByWeight?: boolean
  /** The weight of one sold portion in grams — see Product.weightGrams. */
  weightGrams?: number
}
