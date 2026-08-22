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
    createdAt: now,
    updatedAt: now
  }
}

/** Field keys that hold several saved options with a favorite, as opposed to name/orderNumber which
 * are always a single plain value. */
export const MULTI_VALUE_FIELDS = ['text1', 'text2', 'countryOfOrigin', 'soldPer'] as const
export type MultiValueFieldKey = (typeof MULTI_VALUE_FIELDS)[number]

/** Dutch labels used both as UI copy and as the binding-key names exposed to card designs (see
 * shared/mergeProductRow.ts) — keep in sync with any bindingKey stored on existing card elements.
 * text1/text2 were labeled "Tekst 1"/"Tekst 2" before — mergeProductRow.ts still emits the merged
 * row under those old labels too, so existing designs bound to them keep resolving unchanged. */
export const PRODUCT_FIELD_LABELS: Record<'name' | 'orderNumber' | 'scaleCode' | MultiValueFieldKey, string> = {
  name: 'Naam',
  orderNumber: 'Bestelnummer',
  scaleCode: 'Weegschaalcode',
  text1: 'Top tekst',
  text2: 'Tekst onder',
  countryOfOrigin: 'Land van herkomst',
  soldPer: 'Verkocht per'
}

/**
 * One row of a bulk product import — parsed in the main process from an Excel sheet, applied in the
 * renderer via productStore.upsertByOrderNumber. Each present field only ever ADDS a saved option and
 * makes it the favorite; it never removes previously-saved alternates for that product.
 */
export interface ProductImportRow {
  orderNumber: string
  name?: string
  scaleCode?: string
  text1?: string
  text2?: string
  countryOfOrigin?: string
  soldPer?: string
}
