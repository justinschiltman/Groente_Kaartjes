/** Pixels-per-millimeter used only for on-screen editing (independent of export DPI, set in Phase 5). */
export const EDITOR_PX_PER_MM = 4

export interface UnitConverters {
  pxPerMm: number
  mmToPx: (mm: number) => number
  pxToMm: (px: number) => number
  /** Font sizes are stored in points (pt), the standard print typography unit. */
  ptToPx: (pt: number) => number
  pxToPt: (px: number) => number
}

/** Builds an independent mm/px/pt converter set for a given scale — the editor uses a fixed screen
 * scale (see below), while the export renderer builds its own instance at print DPI. */
export function createUnitConverters(pxPerMm: number): UnitConverters {
  return {
    pxPerMm,
    mmToPx: (mm) => mm * pxPerMm,
    pxToMm: (px) => px / pxPerMm,
    ptToPx: (pt) => (pt * pxPerMm * 25.4) / 72,
    pxToPt: (px) => (px * 72) / (pxPerMm * 25.4)
  }
}

export const editorUnits = createUnitConverters(EDITOR_PX_PER_MM)

export const mmToPx = editorUnits.mmToPx
export const pxToMm = editorUnits.pxToMm
export const ptToPx = editorUnits.ptToPx
export const pxToPt = editorUnits.pxToPt
