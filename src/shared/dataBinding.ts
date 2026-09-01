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

/**
 * True when `element` should render for `row` at all — false only for an element tagged with
 * lineCountVariant whose current text (the resolved bound value, or the static fallback when
 * unbound/no row) doesn't have the matching number of lines. Lets a designer place two fully
 * independent text elements — different position, size, font, everything — as alternates for "the
 * same" box, one that only shows up for a single-line value and one only for a manually-broken
 * two-line value, instead of one box trying to auto-adjust itself between the two.
 */
export function matchesLineCountVariant(element: TextElement, row: DataRow | undefined): boolean {
  if (!element.lineCountVariant) return true
  const resolved = resolveBoundText(element, row)
  const effectiveText = resolved !== null ? resolved : element.text
  const isMulti = effectiveText.includes('\n')
  return element.lineCountVariant === (isMulti ? 'multi' : 'single')
}
