import { contextBridge, ipcRenderer } from 'electron'
import type { FontVariantWithData, ImageAssetWithData } from '@shared/types/asset'
import type { ImportedSheet } from '@shared/types/data'
import type { ExportPdfRequest, ExportPdfResult } from '@shared/types/export'
import type { ProductImportRow } from '@shared/types/product'

const api = {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  listFonts: (): Promise<FontVariantWithData[]> => ipcRenderer.invoke('assets:listFonts'),
  importFonts: (): Promise<FontVariantWithData[]> => ipcRenderer.invoke('assets:importFonts'),
  listImages: (): Promise<ImageAssetWithData[]> => ipcRenderer.invoke('assets:listImages'),
  importImage: (): Promise<ImageAssetWithData | null> => ipcRenderer.invoke('assets:importImage'),
  importExcel: (): Promise<ImportedSheet | null> => ipcRenderer.invoke('data:importExcel'),
  exportPdf: (request: ExportPdfRequest): Promise<ExportPdfResult> => ipcRenderer.invoke('export:pdf', request),
  importProducts: (): Promise<ProductImportRow[] | null> => ipcRenderer.invoke('products:importExcel')
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
