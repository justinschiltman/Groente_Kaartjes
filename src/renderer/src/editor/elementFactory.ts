import type { CardElement, ShapeKind } from '@shared/types/template'

function nextZIndex(elements: CardElement[]): number {
  return elements.reduce((max, el) => Math.max(max, el.zIndex), 0) + 1
}

/** New elements are centered on a card of the given size. */
export function createTextElement(elements: CardElement[], cardWidthMm: number, cardHeightMm: number): CardElement {
  const width = Math.min(60, cardWidthMm * 0.7)
  const height = 12
  return {
    id: crypto.randomUUID(),
    type: 'text',
    x: (cardWidthMm - width) / 2,
    y: (cardHeightMm - height) / 2,
    width,
    height,
    rotation: 0,
    zIndex: nextZIndex(elements),
    text: 'Tekst',
    fontFamily: 'Arial',
    fontSize: 14,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#1f2a24',
    align: 'left',
    formatAs: 'text'
  }
}

/** New elements are centered on a card of the given size, sized to preserve the source image's
 * natural aspect ratio (never distorted on placement — only if the user later resizes non-uniformly). */
export function createImageElement(
  elements: CardElement[],
  cardWidthMm: number,
  cardHeightMm: number,
  asset: { id: string; naturalWidth: number; naturalHeight: number }
): CardElement {
  const aspect = asset.naturalWidth / asset.naturalHeight
  let width = Math.min(60, cardWidthMm * 0.5)
  let height = width / aspect
  const maxHeight = cardHeightMm * 0.8
  if (height > maxHeight) {
    height = maxHeight
    width = height * aspect
  }
  return {
    id: crypto.randomUUID(),
    type: 'image',
    x: (cardWidthMm - width) / 2,
    y: (cardHeightMm - height) / 2,
    width,
    height,
    rotation: 0,
    zIndex: nextZIndex(elements),
    assetId: asset.id
  }
}

export function createShapeElement(
  elements: CardElement[],
  cardWidthMm: number,
  cardHeightMm: number,
  shape: ShapeKind
): CardElement {
  const width = Math.min(30, cardWidthMm * 0.4)
  const height = shape === 'ellipse' ? width : Math.min(20, cardHeightMm * 0.3)
  return {
    id: crypto.randomUUID(),
    type: 'shape',
    shape,
    x: (cardWidthMm - width) / 2,
    y: (cardHeightMm - height) / 2,
    width,
    height,
    rotation: 0,
    zIndex: nextZIndex(elements),
    fill: '#3a7d44',
    strokeWidth: 0,
    cornerRadius: shape === 'rect' ? 0 : undefined
  }
}
