import { readFile } from 'node:fs/promises'
import { dialog } from 'electron'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { parseDecimalNl } from '@shared/format'
import type { ProductImportRow, ProductImportResult } from '@shared/types/product'

type FieldKind = 'string' | 'number' | 'boolean'

const COLUMN_ALIASES: Record<keyof ProductImportRow, { aliases: string[]; kind: FieldKind }> = {
  name: { aliases: ['naam'], kind: 'string' },
  scaleCode: { aliases: ['weegschaalcode', 'weegschaal code', 'schaalcode', 'plu', 'plu code'], kind: 'string' },
  supplierCode: {
    aliases: ['bestelcode (leverancier)', 'bestelcode leverancier', 'bestelcode', 'leverancier bestelcode', 'leverancierscode'],
    kind: 'string'
  },
  text1: { aliases: ['top tekst', 'toptekst', 'tekst 1', 'tekst1'], kind: 'string' },
  text2: { aliases: ['tekst onder', 'tekst 2', 'tekst2'], kind: 'string' },
  countryOfOrigin: { aliases: ['land van herkomst', 'herkomst', 'land'], kind: 'string' },
  soldPer: { aliases: ['verkocht per', 'per'], kind: 'string' },
  pricePerKg: {
    aliases: ['prijs', 'prijs per kilo', 'prijs per kg', 'kiloprijs', 'kilo prijs', 'verkoopprijs', 'adviesprijs'],
    kind: 'number'
  },
  isPromotion: { aliases: ['actie', 'is actie', 'korting', 'aanbieding'], kind: 'boolean' },
  soldByWeight: { aliases: ['per gewicht', 'verkoopeenheid', 'per stuk of gewicht', 'stuk of gewicht'], kind: 'boolean' },
  weightGrams: { aliases: ['gewicht', 'gewicht (gram)', 'gram', 'aantal gram', 'gewicht in gram'], kind: 'number' }
}

const TRUE_TEXT_VALUES = new Set(['ja', 'true', 'waar', 'yes', 'x', '1'])

/** Parts some Excel builds attach (comments, threaded-comment authors, native Tables, legacy VML
 * drawings for comment anchors) that ExcelJS's reader can fail hard on — not because the file is
 * invalid, but because of relationship-path/namespace quirks specific to how that build writes OOXML.
 * None of these parts hold cell values this app reads, so dropping them (see sanitizeWorkbookBuffer)
 * is safe and sidesteps the parser bug entirely rather than chasing each quirk individually. */
const DROPPED_PART_PREFIXES = ['xl/comments', 'xl/threadedcomments', 'xl/persons/', 'xl/tables/', 'xl/drawings/']

/**
 * Re-packages the workbook zip with decorative parts (comments/tables/threaded-comment metadata)
 * removed and any "x:"-prefixed SpreadsheetML namespace normalized back to the default namespace ExcelJS
 * expects. Used only as a fallback when ExcelJS fails to read a file as-is (see importProductsExcel) —
 * most files never need this and take the fast path.
 */
async function sanitizeWorkbookBuffer(buffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer)
  for (const name of Object.keys(zip.files)) {
    if (DROPPED_PART_PREFIXES.some((prefix) => name.toLowerCase().startsWith(prefix))) zip.remove(name)
  }
  for (const [name, file] of Object.entries(zip.files)) {
    if (file.dir || !(name.endsWith('.xml') || name.endsWith('.rels'))) continue
    let text = await file.async('text')
    text = text.replace(/<(\/?)x:/g, '<$1').replace(/\sxmlns:x="[^"]*"/g, '')
    text = text.replace(/<Relationship[^>]*Target="[^"]*(comments|threadedcomments|table|person|vmlDrawing)[^"]*"[^/]*\/>/gi, '')
    text = text.replace(/<Override PartName="[^"]*(comments|threadedcomments|tables|persons)[^"]*"[^/]*\/>/gi, '')
    text = text.replace(/<tableParts[\s\S]*?<\/tableParts>/gi, '')
    text = text.replace(/<legacyDrawing[^/]*\/>/gi, '')
    zip.file(name, text)
  }
  return zip.generateAsync({ type: 'nodebuffer' })
}

function normalizeCellValue(raw: ExcelJS.CellValue): string {
  if (raw === null || raw === undefined) return ''
  if (typeof raw === 'object' && !(raw instanceof Date)) {
    if ('richText' in raw) return raw.richText.map((run) => run.text).join('').trim()
    if ('hyperlink' in raw) return String(raw.text ?? '').trim()
    if ('formula' in raw || 'sharedFormula' in raw) {
      const result = 'result' in raw ? raw.result : undefined
      return result === undefined ? '' : normalizeCellValue(result as ExcelJS.CellValue)
    }
    if ('error' in raw) return ''
  }
  return String(raw).trim()
}

/** Matches a header cell against known column-name aliases (case/whitespace-insensitive). */
function matchColumn(header: string): keyof ProductImportRow | null {
  const normalized = header.trim().toLowerCase()
  for (const [field, { aliases }] of Object.entries(COLUMN_ALIASES) as [keyof ProductImportRow, { aliases: string[] }][]) {
    if (aliases.includes(normalized)) return field
  }
  return null
}

function parseRows(worksheet: ExcelJS.Worksheet): { rows: ProductImportRow[]; skippedRowCount: number } {
  const headerRow = worksheet.getRow(1)
  const columnCount = Math.max(worksheet.columnCount, headerRow.cellCount)
  const columnFields: (keyof ProductImportRow | null)[] = []
  for (let col = 1; col <= columnCount; col++) {
    columnFields.push(matchColumn(normalizeCellValue(headerRow.getCell(col).value)))
  }

  const rows: ProductImportRow[] = []
  let skippedRowCount = 0
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber)
    if (row.cellCount === 0) continue // fully blank row — not a data row to count as skipped
    const record: Partial<ProductImportRow> = {}
    columnFields.forEach((field, index) => {
      if (!field) return
      const kind = COLUMN_ALIASES[field].kind
      const text = normalizeCellValue(row.getCell(index + 1).value)

      if (kind === 'number') {
        // No value entered this week is meaningfully different from a price of 0 — leave it unset
        // (same as any other blank cell) rather than defaulting to 0.
        if (text) {
          const parsed = parseDecimalNl(text)
          if (parsed !== null) (record as Record<string, unknown>)[field] = parsed
        }
      } else if (kind === 'boolean') {
        // Unlike text/number fields, a blank cell in a column that IS present means "Nee" (the column
        // existing at all is the signal the sheet is tracking this per row) — only a genuinely absent
        // column (no matching header, so this branch never runs for that field) leaves it unset.
        ;(record as Record<string, unknown>)[field] = TRUE_TEXT_VALUES.has(text.trim().toLowerCase())
      } else if (text) {
        (record as Record<string, unknown>)[field] = text
      }
    })
    // Bestelcode (leverancier) is the join key when present, but a row without one still gets
    // imported as long as it has a Naam — productStore.ts's upsertBySupplierCode always creates a
    // new product for it rather than matching by name. Only a row with NEITHER has nothing to
    // identify it by at all.
    if (record.supplierCode || record.name) rows.push(record as ProductImportRow)
    else skippedRowCount++
  }

  return { rows, skippedRowCount }
}

export async function importProductsExcel(): Promise<ProductImportResult> {
  const dialogResult = await dialog.showOpenDialog({
    title: 'Producten importeren',
    properties: ['openFile'],
    filters: [{ name: 'Excel-bestanden', extensions: ['xlsx', 'xlsm'] }]
  })
  if (dialogResult.canceled || dialogResult.filePaths.length === 0) return { canceled: true }

  try {
    const workbook = new ExcelJS.Workbook()
    try {
      await workbook.xlsx.readFile(dialogResult.filePaths[0])
    } catch {
      // Some Excel builds write comments/tables/namespace-prefix variants ExcelJS's reader can't
      // handle as-is — retry once against a sanitized copy before giving up (see sanitizeWorkbookBuffer).
      const rawBuffer = await readFile(dialogResult.filePaths[0])
      const sanitized = await sanitizeWorkbookBuffer(rawBuffer)
      // exceljs's declared Buffer type resolves against a different @types/node copy (nested under
      // electron/) than this file's — a real Node Buffer at runtime either way, so cast through `any`
      // rather than fight two non-identical-but-structurally-real "Buffer" nominal types.
      await workbook.xlsx.load(sanitized as any)
    }

    const worksheet = workbook.worksheets[0]
    if (!worksheet) return { canceled: false, error: 'Dit Excel-bestand bevat geen werkblad om te importeren.' }

    const { rows, skippedRowCount } = parseRows(worksheet)
    return { canceled: false, rows, skippedRowCount }
  } catch (error) {
    return {
      canceled: false,
      error: `Dit Excel-bestand kon niet worden gelezen (${error instanceof Error ? error.message : String(error)}). Probeer het bestand opnieuw op te slaan vanuit Excel en importeer het nogmaals.`
    }
  }
}
