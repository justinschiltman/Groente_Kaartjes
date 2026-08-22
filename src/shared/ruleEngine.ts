import type { DataRow } from './types/data'
import type { Template } from './types/template'

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Picks which template a row should use: the first template whose triggerConditions ALL match the
 * row (each condition matching if the row's value for that field is any of the condition's values),
 * else the default template, else the first template. Pure function so it's reusable by both the
 * live rules preview and the export pipeline.
 */
export function resolveTemplateForRow(row: DataRow, templates: Template[], defaultTemplateId: string | null): Template | undefined {
  const match = templates.find((template) => {
    const conditions = template.triggerConditions
    if (!conditions || conditions.length === 0) return false
    return conditions.every((condition) => {
      if (!condition.field || condition.values.length === 0) return false
      const rawValue = row[condition.field]
      const rowValue = normalize(rawValue === null || rawValue === undefined ? '' : String(rawValue))
      return condition.values.some((value) => normalize(value) === rowValue)
    })
  })
  if (match) return match
  return templates.find((t) => t.id === defaultTemplateId) ?? templates[0]
}
