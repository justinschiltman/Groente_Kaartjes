import { existsSync, mkdirSync, readdirSync, readFileSync, copyFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { app, dialog } from 'electron'
import type { ImageAssetWithData } from '@shared/types/asset'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

function imagesDir(): string {
  const dir = join(app.getPath('userData'), 'images')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function readAsset(dir: string, fileName: string): ImageAssetWithData {
  const buffer = readFileSync(join(dir, fileName))
  return {
    id: fileName,
    fileName,
    data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  }
}

export function listImages(): ImageAssetWithData[] {
  const dir = imagesDir()
  return readdirSync(dir)
    .filter((name) => IMAGE_EXTENSIONS.has(extname(name).toLowerCase()))
    .map((name) => readAsset(dir, name))
}

/** Original filenames are kept (not replaced with a UUID) so the library and the on-disk file are
 * both human-readable — de-duplicated only on an actual name collision. */
function uniqueDestName(dir: string, originalName: string): string {
  const ext = extname(originalName)
  const base = basename(originalName, ext)
  let candidate = originalName
  let counter = 1
  while (existsSync(join(dir, candidate))) {
    candidate = `${base} (${counter})${ext}`
    counter++
  }
  return candidate
}

export async function importImage(): Promise<ImageAssetWithData | null> {
  const result = await dialog.showOpenDialog({
    title: 'Afbeelding importeren',
    properties: ['openFile'],
    filters: [{ name: 'Afbeeldingen', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return null

  const dir = imagesDir()
  const destName = uniqueDestName(dir, basename(result.filePaths[0]))
  copyFileSync(result.filePaths[0], join(dir, destName))
  return readAsset(dir, destName)
}
