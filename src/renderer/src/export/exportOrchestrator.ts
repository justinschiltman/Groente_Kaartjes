import { useProductStore } from '@renderer/state/productStore'
import { useProjectStore } from '@renderer/state/projectStore'
import { resolveBoundText } from '@shared/dataBinding'
import { productToRow } from '@shared/mergeProductRow'
import { resolveTemplateForRow } from '@shared/ruleEngine'
import type { Template, TextElement } from '@shared/types/template'
import type { Product } from '@shared/types/product'
import type { ExportPage, ExportPdfResult } from '@shared/types/export'
import { createCardRenderer } from './renderCard'

const EXPORT_DPI = 300
const CARDS_PER_PAGE = 3

export interface ExportProgress {
  rendered: number
  total: number
}

export interface ResolvedCard {
  product: Product
  template: Template
}

export interface IncompleteProduct {
  productName: string
  missingFields: string[]
}

export interface ExportPreflight {
  ready: ResolvedCard[]
  incomplete: IncompleteProduct[]
}

/**
 * Scans every product with quantity > 0, resolves which design it would use, and checks that every
 * text field that design binds to actually has a value — "alle relevante velden moeten ingevuld
 * zijn" per the product's own definition of relevant (whatever its resolved template binds to).
 * Products with nothing missing go in `ready`; everything else goes in `incomplete` for the caller to
 * show the user before deciding whether to skip them and proceed with the rest, or go fix them first.
 */
export function checkProductsForExport(): ExportPreflight {
  const { products } = useProductStore.getState()
  const { templates, defaultTemplateId } = useProjectStore.getState()
  const candidates = products.filter((p) => p.quantity > 0)

  const ready: ResolvedCard[] = []
  const incomplete: IncompleteProduct[] = []

  for (const product of candidates) {
    const row = productToRow(product)
    const template = resolveTemplateForRow(row, templates, defaultTemplateId)
    const productName = product.name || '(naamloos)'

    if (!template) {
      incomplete.push({ productName, missingFields: ['geen ontwerp gevonden'] })
      continue
    }

    const missingFields = [
      ...new Set(
        template.elements
          .filter((el): el is TextElement => el.type === 'text' && Boolean(el.bindingKey))
          .filter((el) => !resolveBoundText(el, row))
          .map((el) => el.bindingKey as string)
      )
    ]

    if (missingFields.length > 0) incomplete.push({ productName, missingFields })
    else ready.push({ product, template })
  }

  return { ready, incomplete }
}

export type ExportOutcome = ExportPdfResult

/**
 * Renders `quantity` copies of each ready card, 3 per A4 page (the last page simply has whatever's
 * left, never padded), and composes them into one PDF. On success, resets quantity/isPromotion/
 * soldByWeight/pricePerKg on exactly the processed products so this batch is never reprinted by
 * accident next time.
 */
export async function runExport(cards: ResolvedCard[], onProgress?: (progress: ExportProgress) => void): Promise<ExportOutcome> {
  const { cardWidthMm, cardHeightMm } = useProjectStore.getState()

  if (cards.length === 0) {
    return { canceled: false, error: 'Geen kaartjes om te verwerken. Zet bij Producten een aantal kaartjes op minstens 1.' }
  }

  const renderer = createCardRenderer(EXPORT_DPI)
  const pngDataUrls: string[] = []
  const total = cards.reduce((sum, c) => sum + c.product.quantity, 0)
  let rendered = 0

  try {
    for (const { product, template } of cards) {
      const row = productToRow(product)
      for (let i = 0; i < product.quantity; i++) {
        pngDataUrls.push(renderer.renderCardPng(template, row, cardWidthMm, cardHeightMm))
        rendered++
        onProgress?.({ rendered, total })
        // Yields to the event loop between renders so the progress dialog can actually repaint
        // instead of the whole batch running as one blocking synchronous stretch.
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }
  } finally {
    await renderer.dispose()
  }

  const pages: ExportPage[] = []
  for (let i = 0; i < pngDataUrls.length; i += CARDS_PER_PAGE) {
    pages.push({ cards: pngDataUrls.slice(i, i + CARDS_PER_PAGE).map((pngDataUrl) => ({ pngDataUrl })) })
  }

  const result = await window.api.exportPdf({ cardWidthMm, cardHeightMm, pages })
  if (!result.canceled && !result.error) {
    useProductStore.getState().resetProcessed(cards.map((c) => c.product.id))
  }
  return result
}
