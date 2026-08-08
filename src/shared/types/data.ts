export type CellValue = string | number | null

export type DataRow = Record<string, CellValue>

export interface ImportedSheet {
  fileName: string
  headers: string[]
  rows: DataRow[]
}
