// fabric is pinned to the exact version 6.9.1 in package.json — do not bump without re-verifying
// text rendering. 7.4.0 (which fixes a known SVG-export XSS advisory, GHSA-hfvx-25r5-qc3w) has a
// reproducible Textbox rendering bug in this app (confirmed via Playwright: only the last glyph of
// a run draws, rest are dropped), while 6.9.1 renders correctly. We never call toSVG()/gradient SVG
// serialization anywhere (export uses canvas.toDataURL() rasterization, see the Phase 5 plan), so the
// XSS's actual code path is unused — but re-check this pin against newer fabric releases periodically.
import { Ellipse, FabricImage, FabricObject, Rect, Textbox } from 'fabric'
import type { CardElement, ElementPatch, ElementType, TextElement } from '@shared/types/template'
import { LEGACY_TEXT_LABELS } from '@shared/mergeProductRow'
import { PRODUCT_FIELD_LABELS } from '@shared/types/product'
import { getImageElement } from '@renderer/state/assetStore'
import { useProjectStore } from '@renderer/state/projectStore'
import { editorUnits, mmToPx, ptToPx, pxToMm, type UnitConverters } from './units'

/** Fabric objects are tagged with the element id they represent, so events can be mapped back to the store. */
export type TaggedFabricObject = FabricObject & { elementId: string; elementType: ElementType }

export function findObjectByElementId(objects: FabricObject[], id: string): TaggedFabricObject | undefined {
  return objects.find((obj) => (obj as TaggedFabricObject).elementId === id) as TaggedFabricObject | undefined
}

/** Never shrunk past this, no matter how long/wide the text — small enough to fit almost anything,
 * still legible on a printed card. */
const MIN_TEXT_FONT_SIZE_PT = 6

/** Fabric's own Textbox default (see fabric's Text class) — set explicitly rather than left implicit
 * so a reused live object (rebinding, live preview, inline edits) always returns to it once the text
 * no longer has a manual line break, not just at construction time. */
const DEFAULT_LINE_HEIGHT = 1.16

/** Tighter stacking used whenever the text has a manual line break (see fitText), so the two
 * resulting lines read as one compact unit instead of Fabric's normal single-line-oriented spacing. */
const TIGHT_LINE_HEIGHT = 0.95

/** Auto-fit only applies to the free-text fields whose length genuinely varies unpredictably per
 * product (a name or a marketing blurb) — not computed/short fields like Prijs per kilo or Actie, and
 * not static (unbound) text, which the designer places and can see and adjust directly. Includes the
 * pre-rename "Tekst 1"/"Tekst 2" labels so an older template's binding still qualifies. */
const AUTO_FIT_BINDING_KEYS = new Set<string>([
  PRODUCT_FIELD_LABELS.name,
  PRODUCT_FIELD_LABELS.text1,
  PRODUCT_FIELD_LABELS.text2,
  LEGACY_TEXT_LABELS.text1,
  LEGACY_TEXT_LABELS.text2
])

/** True when every wrapped line fits within the box width — checked via Fabric's own cached
 * line-width measurement (`getLineWidth`), so the decision stays pixel-consistent with what actually
 * renders (font metrics, charSpacing, kerning included) instead of re-deriving it independently. */
function fitsWidth(textbox: Textbox, boxWidthPx: number): boolean {
  for (let i = 0; i < textbox.textLines.length; i++) {
    if (textbox.getLineWidth(i) > boxWidthPx) return false
  }
  return true
}

/**
 * Shrinks a Textbox's rendered font size — never below MIN_TEXT_FONT_SIZE_PT, never above the
 * element's own configured fontSize — just enough to satisfy two independent constraints:
 *
 * 1. For the three free-text fields in AUTO_FIT_BINDING_KEYS, every wrapped line must fit within the
 *    element's own width, AND the number of rendered lines must never exceed what the text's own
 *    manual "\n" breaks call for (1 line when there are none). Fixes e.g. a long single-word product
 *    name ("Sperziebonen") that has no space to wrap on and would otherwise just overflow past its
 *    box — and just as much, stops Fabric from trading a slightly bigger font for an extra wrapped
 *    line on ordinary multi-word text, which would silently turn a "1 regel" box into two lines. Only
 *    shrinking (down to MIN_TEXT_FONT_SIZE_PT) is ever used to make text fit — never an extra line.
 * 2. For EVERY text element regardless of binding, IF it has actually wrapped onto 2+ lines, their
 *    total rendered height below the element's own Y position must never exceed the card's own bottom
 *    edge. A field outside AUTO_FIT_BINDING_KEYS (e.g. "Verkocht per") still wraps normally by width
 *    — that part is untouched — but if that wrapping pushes a line past the card's physical bottom
 *    edge, the card's rasterization hard-clips it there with no visible sign anything is missing (e.g.
 *    "per 250 gram" wrapping to "per 250" / "gram" with too little room below silently loses "gram" on
 *    the printed card). This is a data-integrity floor, not the cosmetic auto-fit above, so it applies
 *    unconditionally — but ONLY when there's a second line that could go missing. A single line (any
 *    text with no space to wrap on, e.g. a price's whole-euro digits) is exempt even if its full
 *    line-box (ascender/descender padding from the font's metrics, not actual ink) technically extends
 *    past the card edge — that's not content being lost, and a large display price is routinely
 *    positioned exactly that way on purpose.
 *
 * Also switches to a tighter line height whenever the text has a manual line break (a literal "\n" —
 * see MultiOptionField's textarea on "Tekst onder"), so two manually-broken lines read as one compact
 * unit instead of Fabric's normal single-line-oriented spacing — independent of everything else here,
 * and the only thing this function does about multi-line text. A designer who wants a whole different
 * look (position, size, font) depending on line count places two separate elements instead — see
 * TextElement.lineCountVariant and dataBinding.ts's matchesLineCountVariant, which decides which of
 * those ever reaches this function for a given row.
 *
 * A no-op (full configured size, one fit check, top-anchored) for the common case where the current
 * text already satisfies all of this. Purely a rendering-time adjustment on the live fabric object —
 * never reads or writes the store, so the configured fontSize the property inspector shows is never
 * affected. Always resets to the full configured size and top before checking, so repeated calls on
 * the same object (e.g. cycling preview products, or rebinding an element away from an auto-fit-
 * eligible field after it was shrunk) never compound a shrink from an already-shrunk state.
 */
export function fitText(textbox: Textbox, element: TextElement, units: UnitConverters, cardHeightMm: number): void {
  const maxFontSizePx = units.ptToPx(element.fontSize)
  const minFontSizePx = units.ptToPx(MIN_TEXT_FONT_SIZE_PT)
  const autoFitWidth = Boolean(element.bindingKey && AUTO_FIT_BINDING_KEYS.has(element.bindingKey))
  const boxWidthPx = units.mmToPx(element.width)
  const topPx = units.mmToPx(element.y)
  const maxHeightPx = units.mmToPx(cardHeightMm) - topPx
  // The line count the text itself calls for — its manual "\n" breaks, or just 1 when there are none
  // — never how many lines happen to fit at the current font size. Fixed once, from the raw string,
  // before any fontSize change.
  const intendedLineCount = textbox.text.split('\n').length

  function fits(): boolean {
    if (autoFitWidth) {
      // For the three free-text fields, wrapping onto MORE lines than the text's own manual breaks
      // call for is never an acceptable way to satisfy the width — e.g. a "1 regel" box's content
      // must never silently become 2 lines just because that lets the font stay bigger; only shrinking
      // is allowed to make it fit. Fabric would otherwise happily trade a slightly bigger font for an
      // extra wrapped line, which is exactly backwards for a box a designer sized/positioned for one
      // specific line count.
      if (!fitsWidth(textbox, boxWidthPx) || textbox.textLines.length > intendedLineCount) return false
    }
    if (textbox.textLines.length <= 1) return true
    const renderedHeightPx = textbox.height * (textbox.scaleY ?? 1)
    return renderedHeightPx <= maxHeightPx
  }

  textbox.set({ top: topPx, lineHeight: textbox.text.includes('\n') ? TIGHT_LINE_HEIGHT : DEFAULT_LINE_HEIGHT })

  textbox.set({ fontSize: maxFontSizePx })
  if (fits()) return
  textbox.set({ fontSize: minFontSizePx })
  if (!fits()) return // doesn't fit even at the floor — best effort, leave it there
  let lo = minFontSizePx
  let hi = maxFontSizePx
  for (let i = 0; i < 15; i++) {
    const mid = (lo + hi) / 2
    textbox.set({ fontSize: mid })
    if (fits()) lo = mid
    else hi = mid
  }
  textbox.set({ fontSize: lo })
}

/** `units` defaults to the fixed on-screen editor scale; the export renderer passes its own
 * print-DPI converters so the same element-building logic produces print-accurate pixels.
 * `cardHeightMm` defaults to the project's current card height — the export renderer passes the
 * exact height it's rendering at instead, in case that ever diverges from the live store value. */
export function buildFabricObject(
  element: CardElement,
  units: UnitConverters = editorUnits,
  cardHeightMm: number = useProjectStore.getState().cardHeightMm
): TaggedFabricObject {
  const { mmToPx, ptToPx } = units
  const common = {
    left: mmToPx(element.x),
    top: mmToPx(element.y),
    angle: element.rotation,
    strokeUniform: true
  }

  let obj: FabricObject

  if (element.type === 'text') {
    const textbox = new Textbox(element.text, {
      ...common,
      width: mmToPx(element.width),
      fontFamily: element.fontFamily,
      fontSize: ptToPx(element.fontSize),
      fontWeight: element.fontWeight,
      fontStyle: element.fontStyle,
      fill: element.color,
      textAlign: element.align,
      charSpacing: element.letterSpacing ?? 0,
      splitByGrapheme: false,
      // A real scale transform, not a height — Textbox's own height is always derived from content/
      // font/width, so this is what actually stretches/squashes the glyphs on purpose (see
      // readGeometryPatch below for why this is never baked into height like Rect/Ellipse are).
      scaleY: element.verticalScale ?? 1
    })
    fitText(textbox, element, units, cardHeightMm)
    // Height isn't a free dimension on a Textbox (see readGeometryPatch) — Fabric's only way to
    // visually honor a vertical drag is to stretch the glyphs (scaleY), which silently turned any
    // top/bottom-edge or corner drag into the same distortion meant only for the deliberate
    // "Verticale rek (%)" field (e.g. the whole-euros price). Only the width handles (reflow, the
    // one thing a text box's drag should ever do) and rotation stay draggable; vertical stretch is
    // now only ever set by explicitly typing a percentage.
    textbox.setControlsVisibility({ mt: false, mb: false, tl: false, tr: false, bl: false, br: false })
    obj = textbox
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
    // Edge handles (mt/mb/ml/mr) always scale a single axis, which would stretch/distort the
    // image. Only the corner handles remain, which scale both axes together by default (Fabric's
    // canvas.uniformScaling), so resizing an image can only ever make it bigger or smaller.
    obj.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false })
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

  if (obj instanceof FabricImage) {
    // Unlike Rect/Ellipse, an image's own .width/.height must stay pinned to the source's natural
    // pixel size forever: Fabric's image renderer treats width/height that exceed or fall short of
    // the natural size as a CROP boundary (see FabricImage._renderFill, which clamps the drawn
    // source rect to the natural element size), not a free logical size. Baking scale into them the
    // way Rect/Ellipse do would crop the image instead of scaling it. So sizing stays expressed
    // purely as scaleX/scaleY, and width/height are only ever read here, never written.
    const widthPx = (obj.width ?? 0) * scaleX
    const heightPx = (obj.height ?? 0) * scaleY
    obj.setCoords()
    return {
      x: pxToMm(obj.left ?? 0),
      y: pxToMm(obj.top ?? 0),
      width: pxToMm(widthPx),
      height: pxToMm(heightPx),
      rotation: obj.angle ?? 0
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
    // See readGeometryPatch: an image's .width must stay at the source's natural size, so a width
    // patch is expressed as a scaleX relative to that natural size instead of writing .width directly.
    else if (obj instanceof FabricImage) updates.scaleX = mmToPx(patch.width) / (obj.width || 1)
    else updates.width = mmToPx(patch.width)
  }
  // Textbox height is excluded here on purpose — see readGeometryPatch. It's never a free dimension
  // for text, so patching it directly would just fight Fabric's own content-driven recomputation.
  if (patch.height !== undefined && !(obj instanceof Textbox)) {
    if (obj instanceof Ellipse) updates.ry = mmToPx(patch.height) / 2
    else if (obj instanceof FabricImage) updates.scaleY = mmToPx(patch.height) / (obj.height || 1)
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
    if (patch.letterSpacing !== undefined) updates.charSpacing = patch.letterSpacing
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
