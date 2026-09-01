export type ElementType = 'text' | 'image' | 'shape'

export interface BaseElement {
  id: string
  type: ElementType
  /** All geometry is in millimeters — the print-accurate source of truth. Editors convert to px for display. */
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
}

export interface TextElement extends BaseElement {
  type: 'text'
  text: string
  bindingKey?: string
  fontFamily: string
  fontSize: number
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  color: string
  align: 'left' | 'center' | 'right'
  formatAs: 'text' | 'currency' | 'number'
  /** Stretches glyphs vertically independent of the font's normal proportions (Fabric's scaleY
   * transform) — separate from width, which only ever reflows text, never distorts it. 1 = normal. */
  verticalScale?: number
  /** Extra space between letters, in thousandths of the font size (Fabric's charSpacing unit —
   * the same "tracking" convention used by Illustrator/Photoshop). 0 = normal, negative = tighter. */
  letterSpacing?: number
  /** When true, `height` becomes a real vertical target instead of the otherwise-vestigial
   * initial-placement value (a Textbox's height is normally fully content-derived — see
   * fabricSync.ts's readGeometryPatch): exactly 1 rendered line is centered within [y, y+height] at
   * the configured font size (still shrunk by width as normal); 2+ rendered lines (typically from a
   * manual line break typed into the bound value) are tight-spaced and grown/shrunk together so
   * their combined block height fills [y, y+height], also centered. See fitText in fabricSync.ts. */
  verticalFit?: boolean
}

export interface ImageElement extends BaseElement {
  type: 'image'
  /** References an imported image in the asset library (see assetStore.ts). Undefined/unresolved
   * (e.g. the backing file was removed) renders as a placeholder box rather than nothing. */
  assetId?: string
}

export type ShapeKind = 'rect' | 'ellipse'

export interface ShapeElement extends BaseElement {
  type: 'shape'
  shape: ShapeKind
  fill: string
  /** When true, the shape renders with no fill (outline only) regardless of the stored fill color
   * — kept separate from fill itself so toggling this off restores the last-picked color. */
  transparentFill?: boolean
  stroke?: string
  strokeWidth: number
  cornerRadius?: number
}

export type CardElement = TextElement | ImageElement | ShapeElement

/** All fields from every element type, each optional — lets property-editing UI patch whichever type is selected. */
export type ElementPatch = Partial<TextElement> & Partial<ImageElement> & Partial<ShapeElement>

/** One condition in a template's trigger: matches when the row's value for `field` equals ANY of
 * `values` (case/whitespace-insensitive) — e.g. field "Actie", values ["Ja"]. */
export interface TemplateCondition {
  field: string
  values: string[]
}

export interface Template {
  id: string
  name: string
  /** Card dimensions are project-wide (see projectStore), not per-template — every design must
   * share one size so any of them can drop into any of the 3 slots on a stacked A4 export page. */
  backgroundColor: string
  /** This design is selected for a row when ALL of these conditions match (AND across conditions,
   * OR within one condition's values) — e.g. Actie=Ja AND Per gewicht=Ja picks a design distinct from
   * Actie=Ja AND Per gewicht=Nee. Empty/undefined means this design is never picked by a rule, only
   * ever used as the project's default. */
  triggerConditions?: TemplateCondition[]
  elements: CardElement[]
  createdAt: string
  updatedAt: string
}

export function createDefaultTemplate(): Template {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: 'Naamloos ontwerp',
    backgroundColor: '#ffffff',
    elements: [],
    createdAt: now,
    updatedAt: now
  }
}
