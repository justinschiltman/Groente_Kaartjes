import type { DataRow } from './types/data'
import type { Template } from './types/template'

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Picks which template a data row should use: the first template whose triggerValues contains
 * the row's value in triggerField (case/whitespace-insensitive), else the default template, else
 * the first template. Pure function so it can be reused by the batch export pipeline later.
 */
export function resolveTemplateForRow(
  row: DataRow,
  templates: Template[],
  triggerField: string | null,
  defaultTemplateId: string | null
): Template | undefined {
  if (triggerField) {
    const rawValue = row[triggerField]
    const rowValue = normalize(rawValue === null ? '' : String(rawValue))
    const match = templates.find((template) => template.triggerValues?.some((value) => normalize(value) === rowValue))
    if (match) return match
  }
  return templates.find((template) => template.id === defaultTemplateId) ?? templates[0]
}
