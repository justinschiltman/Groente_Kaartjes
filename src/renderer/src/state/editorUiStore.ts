import { create } from 'zustand'

interface EditorUiState {
  selectedElementId: string | null
  select: (id: string | null) => void
}

export const useEditorUiStore = create<EditorUiState>((set) => ({
  selectedElementId: null,
  select: (id) => set({ selectedElementId: id })
}))
