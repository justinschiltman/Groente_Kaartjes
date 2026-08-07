import { ipcMain } from 'electron'
import { importFonts, listFonts } from '../services/fontRegistry.service'

export function registerAssetsIpc(): void {
  ipcMain.handle('assets:listFonts', () => listFonts())
  ipcMain.handle('assets:importFonts', () => importFonts())
}
