import { writeFile } from 'node:fs/promises'
import { dialog } from 'electron'
import { PDFDocument } from 'pdf-lib'
import { A4_HEIGHT_MM, A4_WIDTH_MM } from '@shared/constants'
import type { ExportPdfRequest, ExportPdfResult } from '@shared/types/export'

const MM_TO_PT = 2.834645669

function defaultFileName(): string {
  const now = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `prijskaartjes-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.pdf`
}

function pngDataUrlToBytes(dataUrl: string): Buffer {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return Buffer.from(base64, 'base64')
}

export async function exportPdf(request: ExportPdfRequest): Promise<ExportPdfResult> {
  const saveResult = await dialog.showSaveDialog({
    title: 'PDF exporteren',
    defaultPath: defaultFileName(),
    filters: [{ name: 'PDF-bestanden', extensions: ['pdf'] }]
  })
  if (saveResult.canceled || !saveResult.filePath) return { canceled: true }

  try {
    const pdfDoc = await PDFDocument.create()
    const pageWidthPt = A4_WIDTH_MM * MM_TO_PT
    const pageHeightPt = A4_HEIGHT_MM * MM_TO_PT
    const cardWidthPt = request.cardWidthMm * MM_TO_PT
    const cardHeightPt = request.cardHeightMm * MM_TO_PT

    for (const pageSpec of request.pages) {
      const page = pdfDoc.addPage([pageWidthPt, pageHeightPt])
      for (let i = 0; i < pageSpec.cards.length; i++) {
        const pngImage = await pdfDoc.embedPng(pngDataUrlToBytes(pageSpec.cards[i].pngDataUrl))
        // Cards stack top-to-bottom; PDF page coordinates originate bottom-left, so the first
        // card sits highest (closest to the top edge) and each next one drops down by one card height.
        const y = pageHeightPt - cardHeightPt * (i + 1)
        page.drawImage(pngImage, { x: 0, y, width: cardWidthPt, height: cardHeightPt })
      }
    }

    const pdfBytes = await pdfDoc.save()
    await writeFile(saveResult.filePath, pdfBytes)
    return { canceled: false, filePath: saveResult.filePath }
  } catch (error) {
    return { canceled: false, error: error instanceof Error ? error.message : 'Onbekende fout bij PDF-export.' }
  }
}
