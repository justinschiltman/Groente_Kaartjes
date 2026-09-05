import { ipcMain } from 'electron'
import type { BackupPayload } from '@shared/types/backup'
import { exportBackup, importBackup } from '../services/backup.service'

export function registerBackupIpc(): void {
  ipcMain.handle('backup:export', (_event, payload: BackupPayload) => exportBackup(payload))
  ipcMain.handle('backup:import', () => importBackup())
}
