import { ipcMain } from 'electron'
import { importExcel } from '../services/dataImport.service'

export function registerDataIpc(): void {
  ipcMain.handle('data:importExcel', () => importExcel())
}
