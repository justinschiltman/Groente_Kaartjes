export interface FontVariant {
  familyName: string
  bold: boolean
  italic: boolean
  fileName: string
}

/** A font variant plus its raw file bytes, as sent from main to renderer for FontFace registration. */
export interface FontVariantWithData extends FontVariant {
  data: ArrayBuffer
}

/** An imported image plus its raw file bytes. fileName doubles as the on-disk name (already
 * collision-free, see imageRegistry.service.ts) and as a human-readable display name. */
export interface ImageAssetWithData {
  id: string
  fileName: string
  data: ArrayBuffer
}
