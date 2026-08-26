import { StaticCanvas, Textbox } from 'fabric'
import { resolveBoundText } from '@shared/dataBinding'
import type { DataRow } from '@shared/types/data'
import type { Template } from '@shared/types/template'
import { buildFabricObject, fitTextToWidth } from '../editor/fabricSync'
import { createUnitConverters } from '../editor/units'

export interface CardRenderer {
  renderCardPng: (template: Template, row: DataRow | undefined, widthMm: number, heightMm: number) => string
  dispose: () => Promise<void>
}

/**
 * A detached Fabric canvas (never appended to the visible DOM) reused across an entire export batch.
 * Runs in this same renderer process — real Chromium canvas + font shaping, same buildFabricObject
 * used by the live editor, just at print DPI instead of the fixed editor screen scale — so exported
 * cards match what was designed without needing a second hidden BrowserWindow/IPC round-trip.
 */
export function createCardRenderer(dpi: number): CardRenderer {
  const units = createUnitConverters(dpi / 25.4)
  const canvas = new StaticCanvas(document.createElement('canvas'), { enableRetinaScaling: false })

  function renderCardPng(template: Template, row: DataRow | undefined, widthMm: number, heightMm: number): string {
    canvas.clear()
    canvas.setDimensions({ width: Math.round(units.mmToPx(widthMm)), height: Math.round(units.mmToPx(heightMm)) })
    canvas.backgroundColor = template.backgroundColor
    const sorted = [...template.elements].sort((a, b) => a.zIndex - b.zIndex)
    for (const element of sorted) {
      const obj = buildFabricObject(element, units)
      if (element.type === 'text') {
        const resolved = resolveBoundText(element, row)
        if (resolved !== null) obj.set('text', resolved)
        // Re-fit after swapping in this row's actual value — the box was already fit once for the
        // template's static/placeholder text, which is generally a different length.
        if (obj instanceof Textbox) fitTextToWidth(obj, element, units)
      }
      canvas.add(obj)
    }
    canvas.renderAll()
    return canvas.toDataURL({ format: 'png', multiplier: 1 })
  }

  return {
    renderCardPng,
    dispose: async () => {
      await canvas.dispose()
    }
  }
}
