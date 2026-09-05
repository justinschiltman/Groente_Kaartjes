import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, dialog } from 'electron'
import type { BackupExportResult, BackupFile, BackupImportResult, BackupPayload } from '@shared/types/backup'
import { listFonts } from './fontRegistry.service'
import { listImages } from './imageRegistry.service'

function fontsDir(): string {
  const dir = join(app.getPath('userData'), 'fonts')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function imagesDir(): string {
  const dir = join(app.getPath('userData'), 'images')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function defaultFileName(): string {
  const now = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `groente-kaartjes-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.json`
}

export async function exportBackup(payload: BackupPayload): Promise<BackupExportResult> {
  const saveResult = await dialog.showSaveDialog({
    title: 'Volledige back-up opslaan',
    defaultPath: defaultFileName(),
    filters: [{ name: 'Back-up-bestanden', extensions: ['json'] }]
  })
  if (saveResult.canceled || !saveResult.filePath) return { canceled: true }

  try {
    const backup: BackupFile = {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      project: payload.project,
      products: payload.products,
      fonts: listFonts().map((font) => ({ fileName: font.fileName, dataBase64: Buffer.from(font.data).toString('base64') })),
      images: listImages().map((image) => ({ fileName: image.fileName, dataBase64: Buffer.from(image.data).toString('base64') }))
    }
    writeFileSync(saveResult.filePath, JSON.stringify(backup))
    return { canceled: false, filePath: saveResult.filePath }
  } catch (error) {
    return { canceled: false, error: error instanceof Error ? error.message : 'Onbekende fout bij het opslaan van de back-up.' }
  }
}

export async function importBackup(): Promise<BackupImportResult> {
  const openResult = await dialog.showOpenDialog({
    title: 'Back-up openen',
    properties: ['openFile'],
    filters: [{ name: 'Back-up-bestanden', extensions: ['json'] }]
  })
  if (openResult.canceled || openResult.filePaths.length === 0) return { canceled: true }

  try {
    const raw = readFileSync(openResult.filePaths[0], 'utf-8')
    const backup = JSON.parse(raw) as Partial<BackupFile>
    if (backup.formatVersion !== 1) {
      return { canceled: false, error: 'Dit bestand is geen (herkenbaar) Groente Kaartjes back-up-bestand.' }
    }

    const fontsDest = fontsDir()
    for (const font of backup.fonts ?? []) {
      writeFileSync(join(fontsDest, font.fileName), Buffer.from(font.dataBase64, 'base64'))
    }
    const imagesDest = imagesDir()
    for (const image of backup.images ?? []) {
      writeFileSync(join(imagesDest, image.fileName), Buffer.from(image.dataBase64, 'base64'))
    }

    return { canceled: false, data: { project: backup.project ?? null, products: backup.products ?? null } }
  } catch (error) {
    return {
      canceled: false,
      error: `Dit back-up-bestand kon niet worden gelezen (${error instanceof Error ? error.message : String(error)}).`
    }
  }
}
