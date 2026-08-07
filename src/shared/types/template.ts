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

export interface LayoutGuides {
  /** Non-printing lines that split the card into this many equal bands — a layout aid only, never exported. */
  count: number
  orientation: 'horizontal' | 'vertical'
}

export interface Template {
  id: string
  name: string
  cardWidthMm: number
  cardHeightMm: number
  backgroundColor: string
  guides?: LayoutGuides
  elements: CardElement[]
  createdAt: string
  updatedAt: string
}

export function createDefaultTemplate(): Template {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: 'Naamloos ontwerp',
    cardWidthMm: 100,
    cardHeightMm: 70,
    backgroundColor: '#ffffff',
    elements: [],
    createdAt: now,
    updatedAt: now
  }
}
