import { dialog } from 'electron'
import ExcelJS from 'exceljs'
import type { ProductImportRow } from '@shared/types/product'

type FieldKind = 'string' | 'number' | 'boolean'

const COLUMN_ALIASES: Record<keyof ProductImportRow, { aliases: string[]; kind: FieldKind }> = {
  orderNumber: { aliases: ['bestelnummer', 'ordernummer', 'order nummer', 'artikelnummer'], kind: 'string' },
  name: { aliases: ['naam'], kind: 'string' },
  scaleCode: { aliases: ['weegschaalcode', 'weegschaal code', 'schaalcode', 'plu', 'plu code'], kind: 'string' },
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

export async function importProductsExcel(): Promise<ProductImportRow[] | null> {
  const result = await dialog.showOpenDialog({
    title: 'Producten importeren',
    properties: ['openFile'],
    filters: [{ name: 'Excel-bestanden', extensions: ['xlsx', 'xlsm'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return null

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(result.filePaths[0])
  const worksheet = workbook.worksheets[0]
  if (!worksheet) return []

  const headerRow = worksheet.getRow(1)
  const columnCount = Math.max(worksheet.columnCount, headerRow.cellCount)
  const columnFields: (keyof ProductImportRow | null)[] = []
  for (let col = 1; col <= columnCount; col++) {
    columnFields.push(matchColumn(normalizeCellValue(headerRow.getCell(col).value)))
  }

  const rows: ProductImportRow[] = []
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber)
    const record: Partial<ProductImportRow> = {}
    columnFields.forEach((field, index) => {
      if (!field) return
      const kind = COLUMN_ALIASES[field].kind
      const text = normalizeCellValue(row.getCell(index + 1).value)

      if (kind === 'number') {
        // No value entered this week is meaningfully different from a price of 0 — leave it unset
        // (same as any other blank cell) rather than defaulting to 0.
        if (text) {
          const parsed = Number(text.replace(',', '.'))
          if (!Number.isNaN(parsed)) (record as Record<string, unknown>)[field] = parsed
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
    // Order number is the join key — a row without one can't be matched or created meaningfully.
    if (record.orderNumber) rows.push(record as ProductImportRow)
  }

  return rows
}
