import { formatCurrencyNl, formatNumberNl } from './format'
import type { DataRow } from './types/data'
import type { TextElement } from './types/template'

/**
 * Resolves what a bound text element should display for a given data row, with formatAs applied.
 * Returns null when the element isn't bound (caller should fall back to the element's static text) —
 * used by both the editor's live preview and the Phase 5 batch export pipeline.
 */
export function resolveBoundText(element: TextElement, row: DataRow | undefined): string | null {
  if (!element.bindingKey || !row) return null
  const raw = row[element.bindingKey]
  if (raw === null || raw === undefined) return ''
  if (element.formatAs === 'currency' && typeof raw === 'number') return formatCurrencyNl(raw)
  if (element.formatAs === 'number' && typeof raw === 'number') return formatNumberNl(raw)
  return String(raw)
}
