import { create } from 'zustand'
import type { DataRow, ImportedSheet } from '@shared/types/data'

const STORAGE_KEY = 'groente-kaartjes:data'

interface PersistedData {
  fileName: string | null
  headers: string[]
  rows: DataRow[]
}

function loadPersisted(): PersistedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PersistedData
  } catch {
    // Corrupted or unreadable persisted state falls back to no data rather than crashing.
  }
  return { fileName: null, headers: [], rows: [] }
}

function persist(data: PersistedData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Best-effort only (e.g. storage quota/private browsing) — should never block editing.
  }
}

interface DataState {
  fileName: string | null
  headers: string[]
  rows: DataRow[]
  previewRowIndex: number
  setImportedSheet: (sheet: ImportedSheet) => void
  setPreviewRowIndex: (index: number) => void
}

export const useDataStore = create<DataState>((set, get) => {
  const initial = loadPersisted()
  return {
    fileName: initial.fileName,
    headers: initial.headers,
    rows: initial.rows,
    previewRowIndex: 0,

    setImportedSheet: (sheet) => {
      set({ fileName: sheet.fileName, headers: sheet.headers, rows: sheet.rows, previewRowIndex: 0 })
      persist({ fileName: sheet.fileName, headers: sheet.headers, rows: sheet.rows })
    },

    setPreviewRowIndex: (index) => {
      const { rows } = get()
      set({ previewRowIndex: Math.max(0, Math.min(index, Math.max(0, rows.length - 1))) })
    }
  }
})
