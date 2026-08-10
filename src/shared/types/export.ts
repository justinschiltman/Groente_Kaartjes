export interface ExportCard {
  pngDataUrl: string
}

export interface ExportPage {
  cards: ExportCard[]
}

export interface ExportPdfRequest {
  cardWidthMm: number
  cardHeightMm: number
  pages: ExportPage[]
}

export interface ExportPdfResult {
  canceled: boolean
  filePath?: string
  error?: string
}
