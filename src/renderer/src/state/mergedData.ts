import { EU_STATUS_LABEL, EU_STATUS_LANDBOUW_LABEL } from '@shared/euCountries'
import { currencySplitLabels } from '@shared/format'
import { PORTION_PRICE_LABEL, PRICE_PER_KG_LABEL, WEIGHT_GRAMS_LABEL, productToRow } from '@shared/mergeProductRow'
import { PRODUCT_FIELD_LABELS } from '@shared/types/product'
import type { DataRow } from '@shared/types/data'
import type { Product } from '@shared/types/product'
import { useEditorUiStore } from './editorUiStore'
import { useProductStore } from './productStore'

const PRICE_SPLIT_LABELS = currencySplitLabels(PRICE_PER_KG_LABEL)
const PORTION_PRICE_SPLIT_LABELS = currencySplitLabels(PORTION_PRICE_LABEL)

/** Every field a card element (or a rule's trigger condition) can bind to. All of them come from the
 * product database now (see mergeProductRow.ts's productToRow) — Naam and Weegschaalcode exactly as
 * directly as Prijs per kilo or the derived EU/Niet-EU — so a design never depends on import order or
 * timing; every field is assignable from the moment you start designing.
 * The legacy "Tekst 1"/"Tekst 2" aliases (see mergeProductRow.ts) are deliberately left out here —
 * they still resolve for designs bound to them, but new bindings should only ever pick the current
 * "Top tekst"/"Tekst onder" labels. */
export const AVAILABLE_FIELDS = [
  PRODUCT_FIELD_LABELS.name,
  PRODUCT_FIELD_LABELS.orderNumber,
  PRODUCT_FIELD_LABELS.scaleCode,
  PRODUCT_FIELD_LABELS.text1,
  PRODUCT_FIELD_LABELS.text2,
  PRODUCT_FIELD_LABELS.countryOfOrigin,
  PRODUCT_FIELD_LABELS.soldPer,
  EU_STATUS_LABEL,
  EU_STATUS_LANDBOUW_LABEL,
  PRODUCT_FIELD_LABELS.isPromotion,
  PRODUCT_FIELD_LABELS.soldByWeight,
  WEIGHT_GRAMS_LABEL,
  PRICE_PER_KG_LABEL,
  PRICE_SPLIT_LABELS.whole,
  PRICE_SPLIT_LABELS.cents,
  PORTION_PRICE_LABEL,
  PORTION_PRICE_SPLIT_LABELS.whole,
  PORTION_PRICE_SPLIT_LABELS.cents
]

/** Hook form, for components that prefer the useX naming convention — the list is static, so this is
 * just a thin wrapper, not an actual subscription. */
export function useAvailableFields(): string[] {
  return AVAILABLE_FIELDS
}

/** The product currently chosen to preview designs against (editorUiStore.previewProductId), falling
 * back to the first product in the catalog so there's always something to preview against as soon as
 * any product exists — matching how the old row-based preview always showed row 1 by default. */
export function usePreviewProduct(): Product | undefined {
  const products = useProductStore((state) => state.products)
  const previewProductId = useEditorUiStore((state) => state.previewProductId)
  const selected = previewProductId ? products.find((p) => p.id === previewProductId) : undefined
  return selected ?? products[0]
}

export function usePreviewRow(): DataRow | undefined {
  const product = usePreviewProduct()
  return product ? productToRow(product) : undefined
}

/** Non-hook equivalent of usePreviewRow, for imperative code (Fabric event handlers, export). */
export function getPreviewRow(): DataRow | undefined {
  const { previewProductId } = useEditorUiStore.getState()
  const { products } = useProductStore.getState()
  const selected = previewProductId ? products.find((p) => p.id === previewProductId) : undefined
  const product = selected ?? products[0]
  return product ? productToRow(product) : undefined
}
