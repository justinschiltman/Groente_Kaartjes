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
}

export interface ImageElement extends BaseElement {
  type: 'image'
  assetId?: string
  fit: 'contain' | 'cover' | 'stretch'
}

export type ShapeKind = 'rect' | 'ellipse'

export interface ShapeElement extends BaseElement {
  type: 'shape'
  shape: ShapeKind
  fill: string
  stroke?: string
  strokeWidth: number
  cornerRadius?: number
}

export type CardElement = TextElement | ImageElement | ShapeElement

/** All fields from every element type, each optional — lets property-editing UI patch whichever type is selected. */
export type ElementPatch = Partial<TextElement> & Partial<ImageElement> & Partial<ShapeElement>

export interface Template {
  id: string
  name: string
  /** Card dimensions are project-wide (see projectStore), not per-template — every design must
   * share one size so any of them can drop into any of the 3 slots on a stacked A4 export page. */
  backgroundColor: string
  /** Values that select this design when the project's trigger column matches (case/whitespace-insensitive). */
  triggerValues?: string[]
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
