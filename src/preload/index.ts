import { contextBridge, ipcRenderer } from 'electron'
import type { FontVariantWithData } from '@shared/types/asset'
import type { ImportedSheet } from '@shared/types/data'
import type { ExportPdfRequest, ExportPdfResult } from '@shared/types/export'

const api = {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  listFonts: (): Promise<FontVariantWithData[]> => ipcRenderer.invoke('assets:listFonts'),
  importFonts: (): Promise<FontVariantWithData[]> => ipcRenderer.invoke('assets:importFonts'),
  importExcel: (): Promise<ImportedSheet | null> => ipcRenderer.invoke('data:importExcel'),
  exportPdf: (request: ExportPdfRequest): Promise<ExportPdfResult> => ipcRenderer.invoke('export:pdf', request)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
