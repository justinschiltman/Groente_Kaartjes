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
 * shared/mergeProductRow.ts) — keep in sync with any bindingKey stored on existing card elements. */
export const PRODUCT_FIELD_LABELS: Record<'name' | 'orderNumber' | MultiValueFieldKey, string> = {
  name: 'Naam',
  orderNumber: 'Bestelnummer',
  text1: 'Tekst 1',
  text2: 'Tekst 2',
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
  text1?: string
  text2?: string
  countryOfOrigin?: string
  soldPer?: string
}
