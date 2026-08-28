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

/** Inverse of the import side's ";"-splitting (see productStore.ts's withFavoritedMulti) — puts the
 * favorite first, then every other saved option, joined by "; ". Exporting then re-importing without
 * editing a cell reproduces the exact same options and favorite. */
export function multiValueToExportText(field: MultiValueField): string {
  const rest = field.options.filter((o) => o !== field.favorite)
  return [field.favorite, ...rest].filter(Boolean).join('; ')
}

export interface Product {
  id: string
  name: string
  orderNumber: string
  /** The code entered at the weighing scale for loose produce — always the same value for a given
   * product, like orderNumber, so it's a plain field rather than a MultiValueField. */
  scaleCode: string
  /** The supplier's own product/order code (distinct from orderNumber, which is this catalog's own
   * "GK000N" identifier) — plain field for the same reason as scaleCode. */
  supplierCode: string
  text1: MultiValueField
  text2: MultiValueField
  countryOfOrigin: MultiValueField
  soldPer: MultiValueField
  /** How many cards of this product to generate on the next "Verwerken" — the weekly work list.
   * Reset to 0 (along with isPromotion) once those cards are processed, so last week's batch is never
   * accidentally reprinted. Unlike isPromotion, soldByWeight/pricePerKg/weightGrams are NOT reset —
   * they usually don't change week to week, so re-typing them every time would just be busywork. */
  quantity: number
  /** Whether this week's card should use a promotion ("actie") design. Along with soldByWeight, this
   * is what a template's triggerConditions match against — see shared/ruleEngine.ts. Reset to false
   * once this product's cards are processed (see productStore.ts's resetProcessed) — a promotion is
   * assumed to be a one-week thing unless explicitly turned back on, unlike soldByWeight/pricePerKg/
   * weightGrams below, which persist untouched. */
  isPromotion: boolean
  /** Sold by weight (true) vs. per piece (false) — the other half of the design trigger, independent
   * of isPromotion (see PRODUCT_FIELD_LABELS.soldByWeight, "Per gewicht"). Persists across "Verwerken"
   * runs (not reset) since it's rarely different from one week to the next for a given product. */
  soldByWeight: boolean
  /** The current price per kilo, or null when not (yet) set. Persists across "Verwerken" runs (not
   * reset) so it only needs updating when it actually changes, not every single week. See format.ts's
   * splitCurrencyParts for how a bound design shows this as one amount, or as separate whole-euro/cents
   * parts. */
  pricePerKg: number | null
  /** The weight of one sold portion in grams (e.g. 100/250/500), only meaningful — and only editable
   * in the UI — while soldByWeight is true. Drives the computed "price at this weight" field in
   * mergeProductRow.ts (pricePerKg / 1000 * weightGrams). Persists across "Verwerken" runs and even
   * across soldByWeight being unchecked, but mergeProductRow.ts only surfaces it while soldByWeight is
   * true so a stale value never leaks onto a per-piece card. */
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
    supplierCode: '',
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
  'name' | 'orderNumber' | 'scaleCode' | 'supplierCode' | 'isPromotion' | 'soldByWeight' | MultiValueFieldKey,
  string
> = {
  name: 'Naam',
  orderNumber: 'Bestelnummer',
  scaleCode: 'Weegschaalcode',
  supplierCode: 'Bestelcode (leverancier)',
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
  supplierCode?: string
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

/** Result of a "Producten importeren" pick — always one of exactly these outcomes, so the renderer
 * never has to guess why nothing happened (matches the canceled/error/success shape ExportPdfResult
 * already uses). skippedRowCount counts data rows that had no recognizable Bestelnummer and so
 * couldn't be imported (Bestelnummer is the only required column). */
export interface ProductImportResult {
  canceled: boolean
  rows?: ProductImportRow[]
  skippedRowCount?: number
  error?: string
}

/**
 * One row of a full-catalog Excel export (see products:exportExcel) — the same columns
 * productImport.service.ts recognizes on the way back in, so editing the exported file and
 * re-importing it round-trips cleanly. "Verkocht per" is deliberately not included: it's fully
 * computed from soldByWeight/weightGrams (see mergeProductRow.ts's deriveSoldPer) rather than
 * something to hand-edit, so exporting it as if it were editable data would be misleading.
 */
export interface ProductExportRow {
  orderNumber: string
  name: string
  scaleCode: string
  supplierCode: string
  countryOfOrigin: string
  text1: string
  text2: string
  pricePerKg: number | null
  isPromotion: boolean
  soldByWeight: boolean
  weightGrams: number | null
}

/** Result of a "Producten exporteren" save — same canceled/error/success shape as the other
 * file-dialog-backed results in this app (ExportPdfResult, ProductImportResult). */
export interface ProductExportResult {
  canceled: boolean
  filePath?: string
  error?: string
}
