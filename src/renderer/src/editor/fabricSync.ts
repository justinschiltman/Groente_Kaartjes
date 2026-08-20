// fabric is pinned to the exact version 6.9.1 in package.json — do not bump without re-verifying
// text rendering. 7.4.0 (which fixes a known SVG-export XSS advisory, GHSA-hfvx-25r5-qc3w) has a
// reproducible Textbox rendering bug in this app (confirmed via Playwright: only the last glyph of
// a run draws, rest are dropped), while 6.9.1 renders correctly. We never call toSVG()/gradient SVG
// serialization anywhere (export uses canvas.toDataURL() rasterization, see the Phase 5 plan), so the
// XSS's actual code path is unused — but re-check this pin against newer fabric releases periodically.
import { Ellipse, FabricImage, FabricObject, Rect, Textbox } from 'fabric'
import type { CardElement, ElementPatch, ElementType } from '@shared/types/template'
import { getImageElement } from '@renderer/state/assetStore'
import { editorUnits, mmToPx, ptToPx, pxToMm, type UnitConverters } from './units'

/** Fabric objects are tagged with the element id they represent, so events can be mapped back to the store. */
export type TaggedFabricObject = FabricObject & { elementId: string; elementType: ElementType }

export function findObjectByElementId(objects: FabricObject[], id: string): TaggedFabricObject | undefined {
  return objects.find((obj) => (obj as TaggedFabricObject).elementId === id) as TaggedFabricObject | undefined
}

/** `units` defaults to the fixed on-screen editor scale; the export renderer passes its own
 * print-DPI converters so the same element-building logic produces print-accurate pixels. */
export function buildFabricObject(element: CardElement, units: UnitConverters = editorUnits): TaggedFabricObject {
  const { mmToPx, ptToPx } = units
  const common = {
    left: mmToPx(element.x),
    top: mmToPx(element.y),
    angle: element.rotation,
    strokeUniform: true
  }

  let obj: FabricObject

  if (element.type === 'text') {
    obj = new Textbox(element.text, {
      ...common,
      width: mmToPx(element.width),
      fontFamily: element.fontFamily,
      fontSize: ptToPx(element.fontSize),
      fontWeight: element.fontWeight,
      fontStyle: element.fontStyle,
      fill: element.color,
      textAlign: element.align,
      splitByGrapheme: false,
      // A real scale transform, not a height — Textbox's own height is always derived from content/
      // font/width, so this is what actually stretches/squashes the glyphs on purpose (see
      // readGeometryPatch below for why this is never baked into height like Rect/Ellipse are).
      scaleY: element.verticalScale ?? 1
    })
  } else if (element.type === 'shape' && element.shape === 'rect') {
    const radiusPx = element.cornerRadius ? mmToPx(element.cornerRadius) : 0
    obj = new Rect({
      ...common,
      width: mmToPx(element.width),
      height: mmToPx(element.height),
      fill: element.transparentFill ? 'transparent' : element.fill,
      stroke: element.stroke,
      strokeWidth: mmToPx(element.strokeWidth),
      rx: radiusPx,
      ry: radiusPx
    })
  } else if (element.type === 'shape' && element.shape === 'ellipse') {
    obj = new Ellipse({
      ...common,
      rx: mmToPx(element.width) / 2,
      ry: mmToPx(element.height) / 2,
      fill: element.transparentFill ? 'transparent' : element.fill,
      stroke: element.stroke,
      strokeWidth: mmToPx(element.strokeWidth)
    })
  } else if (element.type === 'image') {
    const imgEl = getImageElement(element.assetId)
    if (imgEl) {
      obj = new FabricImage(imgEl, {
        ...common,
        scaleX: mmToPx(element.width) / imgEl.naturalWidth,
        scaleY: mmToPx(element.height) / imgEl.naturalHeight
      })
    } else {
      // Asset not (yet) loaded, or its assetId no longer resolves (e.g. the file was removed) — a
      // visibly distinct dashed placeholder rather than silently rendering nothing.
      obj = new Rect({
        ...common,
        width: mmToPx(element.width),
        height: mmToPx(element.height),
        fill: '#eef3ee',
        stroke: '#9fb3a2',
        strokeWidth: 1,
        strokeDashArray: [6, 4]
      })
    }
  } else {
    throw new Error(`Onbekend elementtype: ${(element as CardElement).type}`)
  }

  const tagged = obj as TaggedFabricObject
  tagged.elementId = element.id
  tagged.elementType = element.type
  return tagged
}

/** Reads an object's current geometry as mm, normalizing scaleX/scaleY back to 1 so size stays a plain width/height. */
export function readGeometryPatch(obj: FabricObject): ElementPatch {
  const scaleX = obj.scaleX ?? 1
  const scaleY = obj.scaleY ?? 1

  if (obj instanceof Textbox) {
    // Unlike Rect/Ellipse, a Textbox's own .height is never a free dimension — Fabric recomputes it
    // from content/font/width, so baking scaleY into it wouldn't visually stretch anything (and would
    // fight that recomputation). scaleX is still baked into width (Fabric's own side-handle drag
    // already reflows via .width directly, so scaleX is normally already 1 here; a corner drag is the
    // one case that can leave it non-1). scaleY is kept as-is: it's the deliberate glyph-distortion
    // control, reported as verticalScale instead of height.
    const widthPx = (obj.width ?? 0) * scaleX
    obj.set({ width: widthPx, scaleX: 1 })
    obj.setCoords()
    return {
      x: pxToMm(obj.left ?? 0),
      y: pxToMm(obj.top ?? 0),
      width: pxToMm(widthPx),
      rotation: obj.angle ?? 0,
      verticalScale: scaleY
    }
  }

  let widthPx: number
  let heightPx: number

  if (obj instanceof Ellipse) {
    widthPx = obj.rx * 2 * scaleX
    heightPx = obj.ry * 2 * scaleY
    obj.set({ rx: widthPx / 2, ry: heightPx / 2, scaleX: 1, scaleY: 1 })
  } else {
    widthPx = (obj.width ?? 0) * scaleX
    heightPx = (obj.height ?? 0) * scaleY
    obj.set({ width: widthPx, height: heightPx, scaleX: 1, scaleY: 1 })
  }
  obj.setCoords()

  return {
    x: pxToMm(obj.left ?? 0),
    y: pxToMm(obj.top ?? 0),
    width: pxToMm(widthPx),
    height: pxToMm(heightPx),
    rotation: obj.angle ?? 0
  }
}

/** Reads live text content back from a Textbox after inline editing. */
export function readTextPatch(obj: TaggedFabricObject): ElementPatch {
  if (obj instanceof Textbox) return { text: obj.text }
  return {}
}

/** Applies a store-originated patch (mm/pt) to a live fabric object's px properties, e.g. from the property inspector. */
export function applyPatchToFabricObject(obj: TaggedFabricObject, patch: ElementPatch): void {
  const updates: Record<string, unknown> = {}

  if (patch.x !== undefined) updates.left = mmToPx(patch.x)
  if (patch.y !== undefined) updates.top = mmToPx(patch.y)
  if (patch.rotation !== undefined) updates.angle = patch.rotation

  if (patch.width !== undefined) {
    if (obj instanceof Ellipse) updates.rx = mmToPx(patch.width) / 2
    else updates.width = mmToPx(patch.width)
  }
  // Textbox height is excluded here on purpose — see readGeometryPatch. It's never a free dimension
  // for text, so patching it directly would just fight Fabric's own content-driven recomputation.
  if (patch.height !== undefined && !(obj instanceof Textbox)) {
    if (obj instanceof Ellipse) updates.ry = mmToPx(patch.height) / 2
    else updates.height = mmToPx(patch.height)
  }

  if (obj instanceof Textbox) {
    if (patch.text !== undefined) updates.text = patch.text
    if (patch.color !== undefined) updates.fill = patch.color
    if (patch.fontFamily !== undefined) updates.fontFamily = patch.fontFamily
    if (patch.fontSize !== undefined) updates.fontSize = ptToPx(patch.fontSize)
    if (patch.fontWeight !== undefined) updates.fontWeight = patch.fontWeight
    if (patch.fontStyle !== undefined) updates.fontStyle = patch.fontStyle
    if (patch.align !== undefined) updates.textAlign = patch.align
    if (patch.verticalScale !== undefined) updates.scaleY = patch.verticalScale
  } else {
    if (patch.fill !== undefined) updates.fill = patch.fill
    if (patch.stroke !== undefined) updates.stroke = patch.stroke
    if (patch.strokeWidth !== undefined) updates.strokeWidth = mmToPx(patch.strokeWidth)
    // Checked after patch.fill so it wins when both arrive together (unchecking "transparent" always
    // sends the real color alongside transparentFill: false, so that still applies correctly).
    if (patch.transparentFill === true) updates.fill = 'transparent'
    if (patch.cornerRadius !== undefined && obj instanceof Rect) {
      updates.rx = mmToPx(patch.cornerRadius)
      updates.ry = mmToPx(patch.cornerRadius)
    }
  }

  obj.set(updates)
  obj.setCoords()
}
