import { ipcMain } from 'electron'
import { importProductsExcel } from '../services/productImport.service'

export function registerProductsIpc(): void {
  ipcMain.handle('products:importExcel', () => importProductsExcel())
}
