import { create } from 'zustand'

interface AssetState {
  fontFamilies: string[]
  importing: boolean
  setFontFamilies: (families: string[]) => void
  setImporting: (importing: boolean) => void
}

export const useAssetStore = create<AssetState>((set) => ({
  fontFamilies: [],
  importing: false,
  setFontFamilies: (fontFamilies) => set({ fontFamilies }),
  setImporting: (importing) => set({ importing })
}))
