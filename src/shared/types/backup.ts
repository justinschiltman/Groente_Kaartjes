/** A full snapshot of everything stored locally: the design project (templates/rules/card size), the
 * product catalog, and every imported font/image file — all of it lives in this one browser profile
 * (localStorage) plus a userData folder on disk, neither of which carries over when the app is run a
 * different way (e.g. moving from `npm run dev` to an installed build uses a different origin/userData
 * path entirely, even on the same computer). This is the only way to move that data across. */
export interface BackupPayload {
  /** Raw localStorage value for projectStore.ts's STORAGE_KEY, or null if nothing was ever saved. */
  project: string | null
  /** Raw localStorage value for productStore.ts's STORAGE_KEY, or null if nothing was ever saved. */
  products: string | null
}

export interface BackupFile extends BackupPayload {
  formatVersion: 1
  exportedAt: string
  fonts: { fileName: string; dataBase64: string }[]
  images: { fileName: string; dataBase64: string }[]
}

export interface BackupExportResult {
  canceled: boolean
  filePath?: string
  error?: string
}

export interface BackupImportResult {
  canceled: boolean
  data?: BackupPayload
  error?: string
}
