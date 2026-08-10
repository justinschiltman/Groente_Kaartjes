import { useDataStore } from '@renderer/state/dataStore'
import { useProjectStore } from '@renderer/state/projectStore'
import { resolveTemplateForRow } from '@shared/ruleEngine'
import type { ExportPage, ExportPdfResult } from '@shared/types/export'
import { createCardRenderer } from './renderCard'

const EXPORT_DPI = 300
const CARDS_PER_PAGE = 3

export interface ExportProgress {
  rendered: number
  total: number
}

export async function runExport(onProgress?: (progress: ExportProgress) => void): Promise<ExportPdfResult> {
  const { templates, triggerField, defaultTemplateId, cardWidthMm, cardHeightMm } = useProjectStore.getState()
  const { rows } = useDataStore.getState()

  if (rows.length === 0) {
    return { canceled: false, error: 'Importeer eerst een Excel-bestand met producten voordat je exporteert.' }
  }

  const renderer = createCardRenderer(EXPORT_DPI)
  const pngDataUrls: string[] = []

  try {
    for (let i = 0; i < rows.length; i++) {
      const template = resolveTemplateForRow(rows[i], templates, triggerField, defaultTemplateId)
      if (!template) continue
      pngDataUrls.push(renderer.renderCardPng(template, rows[i], cardWidthMm, cardHeightMm))
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

  return window.api.exportPdf({ cardWidthMm, cardHeightMm, pages })
}
