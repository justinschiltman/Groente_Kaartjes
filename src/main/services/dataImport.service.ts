import { basename } from 'node:path'
import { dialog } from 'electron'
import ExcelJS from 'exceljs'
import type { CellValue, DataRow, ImportedSheet } from '@shared/types/data'

function normalizeCellValue(raw: ExcelJS.CellValue): CellValue {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'string') return raw
  if (typeof raw === 'number') return raw
  if (typeof raw === 'boolean') return raw ? 'Waar' : 'Onwaar'
  if (raw instanceof Date) return raw.toLocaleDateString('nl-NL')
  if (typeof raw === 'object') {
    if ('richText' in raw) return raw.richText.map((run) => run.text).join('')
    if ('hyperlink' in raw) return raw.text
    if ('formula' in raw || 'sharedFormula' in raw) {
      const result = 'result' in raw ? raw.result : undefined
      return result === undefined ? null : normalizeCellValue(result as ExcelJS.CellValue)
    }
    if ('error' in raw) return null
  }
  return String(raw)
}

export async function importExcel(): Promise<ImportedSheet | null> {
  const result = await dialog.showOpenDialog({
    title: 'Excel-bestand importeren',
    properties: ['openFile'],
    filters: [{ name: 'Excel-bestanden', extensions: ['xlsx', 'xlsm'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return null

  const filePath = result.filePaths[0]
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) return null

  const headerRow = worksheet.getRow(1)
  const columnCount = Math.max(worksheet.columnCount, headerRow.cellCount)
  const headers: string[] = []
  const seenNames = new Map<string, number>()
  for (let col = 1; col <= columnCount; col++) {
    const raw = normalizeCellValue(headerRow.getCell(col).value)
    let name = raw !== null && String(raw).trim() !== '' ? String(raw).trim() : `Kolom ${col}`
    const priorCount = seenNames.get(name) ?? 0
    seenNames.set(name, priorCount + 1)
    if (priorCount > 0) name = `${name} (${priorCount + 1})`
    headers.push(name)
  }

  const rows: DataRow[] = []
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber)
    const record: DataRow = {}
    let hasValue = false
    headers.forEach((header, index) => {
      const value = normalizeCellValue(row.getCell(index + 1).value)
      if (value !== null && value !== '') hasValue = true
      record[header] = value
    })
    // Trailing blank rows are common in real-world spreadsheets — skip rows with no data at all.
    if (hasValue) rows.push(record)
  }

  return { fileName: basename(filePath), headers, rows }
}
