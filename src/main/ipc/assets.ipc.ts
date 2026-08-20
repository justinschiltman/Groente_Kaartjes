import { ipcMain } from 'electron'
import { importFonts, listFonts } from '../services/fontRegistry.service'
import { importImage, listImages } from '../services/imageRegistry.service'

export function registerAssetsIpc(): void {
  ipcMain.handle('assets:listFonts', () => listFonts())
  ipcMain.handle('assets:importFonts', () => importFonts())
  ipcMain.handle('assets:listImages', () => listImages())
  ipcMain.handle('assets:importImage', () => importImage())
}
