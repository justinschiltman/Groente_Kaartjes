/** Pixels-per-millimeter used only for on-screen editing (independent of export DPI, set in Phase 5). */
export const EDITOR_PX_PER_MM = 4

export function mmToPx(mm: number): number {
  return mm * EDITOR_PX_PER_MM
}

export function pxToMm(px: number): number {
  return px / EDITOR_PX_PER_MM
}

/** Font sizes are stored in points (pt), the standard print typography unit. */
export function ptToPx(pt: number): number {
  return (pt * EDITOR_PX_PER_MM * 25.4) / 72
}

export function pxToPt(px: number): number {
  return (px * 72) / (EDITOR_PX_PER_MM * 25.4)
}
