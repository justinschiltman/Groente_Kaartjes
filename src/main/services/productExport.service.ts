import { dialog } from 'electron'
import ExcelJS from 'exceljs'
import type { ProductExportRow, ProductExportResult } from '@shared/types/product'

// Mirrors productImport.service.ts's primary column headers exactly, minus "Verkocht per" (that
// field is fully computed, not exported — see ProductExportRow's doc comment) — so the file this
// writes re-imports cleanly with no column-mapping surprises.
const COLUMNS = [
  { header: 'Naam', key: 'name', width: 22 },
  { header: 'Weegschaalcode', key: 'scaleCode', width: 15 },
  { header: 'Bestelcode (leverancier)', key: 'supplierCode', width: 20 },
  { header: 'Land van herkomst', key: 'countryOfOrigin', width: 26 },
  { header: 'Top tekst', key: 'text1', width: 32 },
  { header: 'Tekst onder', key: 'text2', width: 32 },
  { header: 'Prijs per kilo', key: 'pricePerKg', width: 15 },
  { header: 'Actie', key: 'isPromotion', width: 10 },
  { header: 'Per gewicht', key: 'soldByWeight', width: 12 },
  { header: 'Gewicht', key: 'weightGrams', width: 12 }
]

function defaultFileName(): string {
  const now = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `producten-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.xlsx`
}

export async function exportProductsExcel(rows: ProductExportRow[]): Promise<ProductExportResult> {
  const saveResult = await dialog.showSaveDialog({
    title: 'Producten exporteren',
    defaultPath: defaultFileName(),
    filters: [{ name: 'Excel-bestanden', extensions: ['xlsx'] }]
  })
  if (saveResult.canceled || !saveResult.filePath) return { canceled: true }

  try {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Groente Kaartjes'
    workbook.created = new Date()

    const sheet = workbook.addWorksheet('Producten', { views: [{ state: 'frozen', ySplit: 1 }] })
    sheet.columns = COLUMNS

    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3A7D44' } }
    headerRow.alignment = { vertical: 'middle' }
    headerRow.height = 20

    for (const row of rows) {
      sheet.addRow({
        name: row.name,
        scaleCode: row.scaleCode,
        supplierCode: row.supplierCode,
        countryOfOrigin: row.countryOfOrigin,
        text1: row.text1,
        text2: row.text2,
        pricePerKg: row.pricePerKg ?? '',
        isPromotion: row.isPromotion ? 'Ja' : 'Nee',
        soldByWeight: row.soldByWeight ? 'Ja' : 'Nee',
        weightGrams: row.weightGrams ?? ''
      })
    }

    // Ja/Nee dropdown on Actie (H) and Per gewicht (I), same as the sjabloon this pairs with.
    const lastRow = rows.length + 1
    for (let r = 2; r <= lastRow; r++) {
      sheet.getCell(`H${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Ja,Nee"'] }
      sheet.getCell(`I${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Ja,Nee"'] }
    }

    await workbook.xlsx.writeFile(saveResult.filePath)
    return { canceled: false, filePath: saveResult.filePath }
  } catch (error) {
    return { canceled: false, error: error instanceof Error ? error.message : 'Onbekende fout bij het exporteren.' }
  }
}
