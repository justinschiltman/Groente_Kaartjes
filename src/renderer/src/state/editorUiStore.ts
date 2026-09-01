import { create } from 'zustand'
import type { CardElement } from '@shared/types/template'

interface EditorUiState {
  selectedElementId: string | null
  select: (id: string | null) => void
  /** Which product's data is shown in canvas/property-panel previews — see mergedData.ts's
   * usePreviewProduct, which falls back to the first product when this is unset. */
  previewProductId: string | null
  setPreviewProduct: (id: string | null) => void
  /** Ctrl+C'd element data, held here (not projectStore) since it's transient UI state, not project
   * data — survives switching templates so Ctrl+V can paste into a DIFFERENT design than it was
   * copied from. Cleared on app restart, same as the rest of this store. */
  clipboardElement: CardElement | null
  copyToClipboard: (element: CardElement) => void
}

export const useEditorUiStore = create<EditorUiState>((set) => ({
  selectedElementId: null,
  select: (id) => set({ selectedElementId: id }),
  previewProductId: null,
  setPreviewProduct: (id) => set({ previewProductId: id }),
  clipboardElement: null,
  copyToClipboard: (element) => set({ clipboardElement: element })
}))
