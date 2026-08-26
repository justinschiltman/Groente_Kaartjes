import { ipcMain } from 'electron'
import type { ProductExportRow } from '@shared/types/product'
import { exportProductsExcel } from '../services/productExport.service'
import { importProductsExcel } from '../services/productImport.service'

export function registerProductsIpc(): void {
  ipcMain.handle('products:importExcel', () => importProductsExcel())
  ipcMain.handle('products:exportExcel', (_event, rows: ProductExportRow[]) => exportProductsExcel(rows))
}
