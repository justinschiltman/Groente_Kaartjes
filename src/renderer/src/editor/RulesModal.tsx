import { useDataStore } from '@renderer/state/dataStore'
import { useAvailableFields, mergeCurrentProducts } from '@renderer/state/mergedData'
import { useProjectStore } from '@renderer/state/projectStore'
import { resolveTemplateForRow } from '@shared/ruleEngine'

const PREVIEW_ROW_LIMIT = 50

interface RulesModalProps {
  onClose: () => void
}

function RulesModal({ onClose }: RulesModalProps): React.JSX.Element {
  const templates = useProjectStore((state) => state.templates)
  const triggerField = useProjectStore((state) => state.triggerField)
  const defaultTemplateId = useProjectStore((state) => state.defaultTemplateId)
  const setTriggerField = useProjectStore((state) => state.setTriggerField)
  const setDefaultTemplateId = useProjectStore((state) => state.setDefaultTemplateId)
  const setTemplateTriggerValues = useProjectStore((state) => state.setTemplateTriggerValues)
  const availableFields = useAvailableFields()
  const rows = useDataStore((state) => state.rows)

  const previewRows = rows.slice(0, PREVIEW_ROW_LIMIT)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Regels: welk ontwerp voor welke rij?</h2>
          <button type="button" onClick={onClose} title="Sluiten">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <label className="field">
            <span>Kolom die bepaalt welk ontwerp gebruikt wordt</span>
            <select value={triggerField ?? ''} onChange={(e) => setTriggerField(e.target.value || null)}>
              <option value="">— Kies een veld —</option>
              {availableFields.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </label>

          <table className="rules-table">
            <thead>
              <tr>
                <th>Ontwerp</th>
                <th>Waarden die dit ontwerp gebruiken (komma-gescheiden)</th>
                <th>Standaard</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id}>
                  <td>{template.name}</td>
                  <td>
                    <input
                      type="text"
                      defaultValue={(template.triggerValues ?? []).join(', ')}
                      placeholder="bijv. 1, 2"
                      onBlur={(e) =>
                        setTemplateTriggerValues(
                          template.id,
                          e.target.value
                            .split(',')
                            .map((v) => v.trim())
                            .filter(Boolean)
                        )
                      }
                    />
                  </td>
                  <td className="rules-default-cell">
                    <input
                      type="radio"
                      name="defaultTemplate"
                      checked={defaultTemplateId === template.id}
                      onChange={() => setDefaultTemplateId(template.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length > 0 && (
            <>
              <h3>Voorbeeld met je geïmporteerde gegevens</h3>
              {rows.length > PREVIEW_ROW_LIMIT && (
                <p className="empty-hint">
                  Toont de eerste {PREVIEW_ROW_LIMIT} van {rows.length} rijen.
                </p>
              )}
              <div className="rules-preview-table-wrap">
                <table className="rules-preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {triggerField && <th>{triggerField}</th>}
                      <th>Ontwerp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, index) => {
                      const mergedRow = mergeCurrentProducts(row)
                      const resolved = resolveTemplateForRow(mergedRow, templates, triggerField, defaultTemplateId)
                      return (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          {triggerField && <td>{String(mergedRow[triggerField] ?? '')}</td>}
                          <td>{resolved ? resolved.name : '(geen ontwerp)'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default RulesModal
