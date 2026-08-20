import { create } from 'zustand'
import type { ImageAsset } from '@renderer/assets/imageLoader'

interface AssetState {
  fontFamilies: string[]
  importing: boolean
  imageAssets: ImageAsset[]
  setFontFamilies: (families: string[]) => void
  setImporting: (importing: boolean) => void
  setImageAssets: (assets: ImageAsset[]) => void
  addImageAsset: (asset: ImageAsset) => void
}

export const useAssetStore = create<AssetState>((set, get) => ({
  fontFamilies: [],
  importing: false,
  imageAssets: [],
  setFontFamilies: (fontFamilies) => set({ fontFamilies }),
  setImporting: (importing) => set({ importing }),
  setImageAssets: (imageAssets) => set({ imageAssets }),
  addImageAsset: (asset) => set({ imageAssets: [...get().imageAssets, asset] })
}))

/** Non-hook lookup for imperative code (buildFabricObject) — returns the pre-loaded, already-decoded
 * image element for a card element's assetId, or undefined if unset/not (yet) loaded. */
export function getImageElement(assetId: string | undefined): HTMLImageElement | undefined {
  if (!assetId) return undefined
  return useAssetStore.getState().imageAssets.find((asset) => asset.id === assetId)?.imgEl
}
