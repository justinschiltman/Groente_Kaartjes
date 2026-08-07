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
