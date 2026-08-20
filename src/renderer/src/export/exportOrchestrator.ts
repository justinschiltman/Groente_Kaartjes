import { useDataStore } from '@renderer/state/dataStore'
import { useProductStore } from '@renderer/state/productStore'
import { useProjectStore } from '@renderer/state/projectStore'
import { findMatchingProduct, mergeProductIntoRow } from '@shared/mergeProductRow'
import { resolveTemplateForRow } from '@shared/ruleEngine'
import type { ExportPage, ExportPdfResult } from '@shared/types/export'
import { createCardRenderer } from './renderCard'

const EXPORT_DPI = 300
const CARDS_PER_PAGE = 3

export interface ExportProgress {
  rendered: number
  total: number
}

export interface ExportOutcome extends ExportPdfResult {
  /** Set when some rows were left out of the PDF — e.g. rows whose order number didn't match any
   * saved product. The export still proceeds with the rest rather than blocking entirely. */
  warning?: string
}

export async function runExport(onProgress?: (progress: ExportProgress) => void): Promise<ExportOutcome> {
  const { templates, triggerField, defaultTemplateId, cardWidthMm, cardHeightMm, orderNumberField } = useProjectStore.getState()
  const { rows } = useDataStore.getState()
  const { products } = useProductStore.getState()

  if (rows.length === 0) {
    return { canceled: false, error: 'Importeer eerst een Excel-bestand met producten voordat je exporteert.' }
  }

  const renderer = createCardRenderer(EXPORT_DPI)
  const pngDataUrls: string[] = []
  const unmatchedOrderNumbers: string[] = []

  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      // Only enforce the product match when the user has actually configured which column is the
      // order number — otherwise this behaves exactly as before the product database existed.
      if (orderNumberField && !findMatchingProduct(row, orderNumberField, products)) {
        unmatchedOrderNumbers.push(String(row[orderNumberField] ?? '(leeg)'))
        continue
      }

      const mergedRow = mergeProductIntoRow(row, orderNumberField, products)
      const template = resolveTemplateForRow(mergedRow, templates, triggerField, defaultTemplateId)
      if (!template) continue
      pngDataUrls.push(renderer.renderCardPng(template, mergedRow, cardWidthMm, cardHeightMm))
      onProgress?.({ rendered: i + 1, total: rows.length })
      // Yields to the event loop between renders so the progress dialog can actually repaint
      // instead of the whole batch running as one blocking synchronous stretch.
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  } finally {
    await renderer.dispose()
  }

  if (pngDataUrls.length === 0) {
    return { canceled: false, error: 'Geen van de rijen kon aan een ontwerp gekoppeld worden.' }
  }

  const pages: ExportPage[] = []
  for (let i = 0; i < pngDataUrls.length; i += CARDS_PER_PAGE) {
    pages.push({ cards: pngDataUrls.slice(i, i + CARDS_PER_PAGE).map((pngDataUrl) => ({ pngDataUrl })) })
  }

  const result = await window.api.exportPdf({ cardWidthMm, cardHeightMm, pages })
  const warning =
    unmatchedOrderNumbers.length > 0
      ? `${unmatchedOrderNumbers.length} rij(en) overgeslagen: geen product gevonden voor bestelnummer ${unmatchedOrderNumbers.join(', ')}.`
      : undefined
  return { ...result, warning }
}
