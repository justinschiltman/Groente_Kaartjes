import { contextBridge, ipcRenderer } from 'electron'
import type { FontVariantWithData, ImageAssetWithData } from '@shared/types/asset'
import type { ExportPdfRequest, ExportPdfResult } from '@shared/types/export'
import type { ProductExportResult, ProductExportRow, ProductImportResult } from '@shared/types/product'

const api = {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  listFonts: (): Promise<FontVariantWithData[]> => ipcRenderer.invoke('assets:listFonts'),
  importFonts: (): Promise<FontVariantWithData[]> => ipcRenderer.invoke('assets:importFonts'),
  listImages: (): Promise<ImageAssetWithData[]> => ipcRenderer.invoke('assets:listImages'),
  importImage: (): Promise<ImageAssetWithData | null> => ipcRenderer.invoke('assets:importImage'),
  exportPdf: (request: ExportPdfRequest): Promise<ExportPdfResult> => ipcRenderer.invoke('export:pdf', request),
  importProducts: (): Promise<ProductImportResult> => ipcRenderer.invoke('products:importExcel'),
  exportProducts: (rows: ProductExportRow[]): Promise<ProductExportResult> => ipcRenderer.invoke('products:exportExcel', rows)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
