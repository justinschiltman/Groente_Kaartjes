import { ipcMain } from 'electron'
import { exportPdf } from '../services/pdfComposer.service'
import type { ExportPdfRequest } from '@shared/types/export'

export function registerExportIpc(): void {
  ipcMain.handle('export:pdf', (_event, request: ExportPdfRequest) => exportPdf(request))
}
