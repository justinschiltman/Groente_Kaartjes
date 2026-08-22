import { create } from 'zustand'

interface EditorUiState {
  selectedElementId: string | null
  select: (id: string | null) => void
  /** Which product's data is shown in canvas/property-panel previews — see mergedData.ts's
   * usePreviewProduct, which falls back to the first product when this is unset. */
  previewProductId: string | null
  setPreviewProduct: (id: string | null) => void
}

export const useEditorUiStore = create<EditorUiState>((set) => ({
  selectedElementId: null,
  select: (id) => set({ selectedElementId: id }),
  previewProductId: null,
  setPreviewProduct: (id) => set({ previewProductId: id })
}))
