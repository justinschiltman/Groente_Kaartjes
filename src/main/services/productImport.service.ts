import { dialog } from 'electron'
import ExcelJS from 'exceljs'
import type { ProductImportRow } from '@shared/types/product'

const COLUMN_ALIASES: Record<keyof ProductImportRow, string[]> = {
  orderNumber: ['bestelnummer', 'ordernummer', 'order nummer', 'artikelnummer'],
  name: ['naam'],
  text1: ['tekst 1', 'tekst1'],
  text2: ['tekst 2', 'tekst2'],
  countryOfOrigin: ['land van herkomst', 'herkomst', 'land'],
  soldPer: ['verkocht per', 'per']
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
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [keyof ProductImportRow, string[]][]) {
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
      const value = normalizeCellValue(row.getCell(index + 1).value)
      if (value) record[field] = value
    })
    // Order number is the join key — a row without one can't be matched or created meaningfully.
    if (record.orderNumber) rows.push(record as ProductImportRow)
  }

  return rows
}
