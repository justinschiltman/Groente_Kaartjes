import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, copyFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { app, dialog } from 'electron'
import * as fontkit from 'fontkit'
import type { FontVariantWithData } from '@shared/types/asset'

const FONT_EXTENSIONS = new Set(['.ttf', '.otf'])

function fontsDir(): string {
  const dir = join(app.getPath('userData'), 'fonts')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function readVariant(filePath: string, fileName: string): FontVariantWithData | null {
  const buffer = readFileSync(filePath)
  let font
  try {
    font = fontkit.create(buffer)
  } catch {
    return null
  }
  // Font collections (.ttc) aren't supported in v1 — treat as a single font if fontkit can't pick one.
  if ('fonts' in font) return null

  const subfamily = font.subfamilyName ?? ''
  return {
    familyName: font.familyName ?? fileName,
    bold: /bold/i.test(subfamily),
    italic: /italic|oblique/i.test(subfamily),
    fileName,
    data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  }
}

export function listFonts(): FontVariantWithData[] {
  const dir = fontsDir()
  const variants: FontVariantWithData[] = []
  for (const fileName of readdirSync(dir)) {
    if (!FONT_EXTENSIONS.has(extname(fileName).toLowerCase())) continue
    const variant = readVariant(join(dir, fileName), fileName)
    if (variant) variants.push(variant)
  }
  return variants
}

export async function importFonts(): Promise<FontVariantWithData[]> {
  const result = await dialog.showOpenDialog({
    title: 'Lettertype importeren',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Lettertypen', extensions: ['ttf', 'otf'] }]
  })
  if (result.canceled) return listFonts()

  const dir = fontsDir()
  for (const sourcePath of result.filePaths) {
    const ext = extname(sourcePath)
    const destName = `${randomUUID()}${ext}`
    copyFileSync(sourcePath, join(dir, destName))
  }
  return listFonts()
}
