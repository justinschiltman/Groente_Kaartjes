import type { ImageAssetWithData } from '@shared/types/asset'

/** A decoded image asset, ready for synchronous use: buildFabricObject constructs a Fabric Image
 * directly from imgEl (already loaded) rather than awaiting Image.fromURL() on every render. */
export interface ImageAsset {
  id: string
  name: string
  blobUrl: string
  imgEl: HTMLImageElement
}

function guessMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  return 'application/octet-stream'
}

async function decodeAsset(asset: ImageAssetWithData): Promise<ImageAsset> {
  const blobUrl = URL.createObjectURL(new Blob([asset.data], { type: guessMimeType(asset.fileName) }))
  const imgEl = new window.Image()
  await new Promise<void>((resolve, reject) => {
    imgEl.onload = () => resolve()
    imgEl.onerror = () => reject(new Error(`Kan afbeelding niet laden: ${asset.fileName}`))
    imgEl.src = blobUrl
  })
  return { id: asset.id, name: asset.fileName, blobUrl, imgEl }
}

function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled'
}

/** Corrupted or unreadable individual files are skipped rather than failing the whole library —
 * unlike fonts, image decoding can fail on file content, not just a missing/unreadable file. */
export async function loadPersistedImages(): Promise<ImageAsset[]> {
  const raw = await window.api.listImages()
  const results = await Promise.allSettled(raw.map(decodeAsset))
  return results.filter(isFulfilled).map((r) => r.value)
}

export async function importImage(): Promise<ImageAsset | null> {
  const raw = await window.api.importImage()
  if (!raw) return null
  return decodeAsset(raw)
}
