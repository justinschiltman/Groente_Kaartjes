import { useAvailableFields } from '@renderer/state/mergedData'
import { productToRow } from '@shared/mergeProductRow'
import { useProductStore } from '@renderer/state/productStore'
import { useProjectStore } from '@renderer/state/projectStore'
import { resolveTemplateForRow } from '@shared/ruleEngine'
import type { TemplateCondition } from '@shared/types/template'

const PREVIEW_ROW_LIMIT = 50

interface RulesModalProps {
  onClose: () => void
}

function RulesModal({ onClose }: RulesModalProps): React.JSX.Element {
  const templates = useProjectStore((state) => state.templates)
  const defaultTemplateId = useProjectStore((state) => state.defaultTemplateId)
  const setDefaultTemplateId = useProjectStore((state) => state.setDefaultTemplateId)
  const addTemplateCondition = useProjectStore((state) => state.addTemplateCondition)
  const updateTemplateCondition = useProjectStore((state) => state.updateTemplateCondition)
  const removeTemplateCondition = useProjectStore((state) => state.removeTemplateCondition)
  const availableFields = useAvailableFields()
  const products = useProductStore((state) => state.products)

  const previewProducts = products.slice(0, PREVIEW_ROW_LIMIT)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Regels: welk ontwerp voor welk product?</h2>
          <button type="button" onClick={onClose} title="Sluiten">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="empty-hint">
            Een ontwerp wordt gekozen zodra AL zijn voorwaarden kloppen (bijv. Actie = Ja ÉN Per gewicht
            = Ja kiest een ander ontwerp dan Actie = Ja alleen). Een ontwerp zonder voorwaarden wordt
            nooit automatisch gekozen — alleen het standaard-ontwerp vangt dan alles op.
          </p>

          <table className="rules-table">
            <thead>
              <tr>
                <th>Ontwerp</th>
                <th>Voorwaarden (moeten allemaal kloppen)</th>
                <th>Standaard</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id}>
                  <td>{template.name}</td>
                  <td>
                    <div className="rule-conditions">
                      {(template.triggerConditions ?? []).map((condition, index) => (
                        <ConditionRow
                          key={index}
                          condition={condition}
                          availableFields={availableFields}
                          onChangeField={(field) => updateTemplateCondition(template.id, index, { field })}
                          onChangeValues={(values) => updateTemplateCondition(template.id, index, { values })}
                          onRemove={() => removeTemplateCondition(template.id, index)}
                        />
                      ))}
                      <button type="button" className="rule-add-condition" onClick={() => addTemplateCondition(template.id)}>
                        + voorwaarde
                      </button>
                    </div>
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

          {products.length > 0 && (
            <>
              <h3>Voorbeeld met je producten</h3>
              {products.length > PREVIEW_ROW_LIMIT && (
                <p className="empty-hint">
                  Toont de eerste {PREVIEW_ROW_LIMIT} van {products.length} producten.
                </p>
              )}
              <div className="rules-preview-table-wrap">
                <table className="rules-preview-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Ontwerp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewProducts.map((product) => {
                      const row = productToRow(product)
                      const resolved = resolveTemplateForRow(row, templates, defaultTemplateId)
                      return (
                        <tr key={product.id}>
                          <td>{product.name || '(naamloos)'}</td>
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

interface ConditionRowProps {
  condition: TemplateCondition
  availableFields: string[]
  onChangeField: (field: string) => void
  onChangeValues: (values: string[]) => void
  onRemove: () => void
}

function ConditionRow({ condition, availableFields, onChangeField, onChangeValues, onRemove }: ConditionRowProps): React.JSX.Element {
  return (
    <div className="rule-condition-row">
      <select value={condition.field} onChange={(e) => onChangeField(e.target.value)}>
        <option value="">— veld —</option>
        {availableFields.map((field) => (
          <option key={field} value={field}>
            {field}
          </option>
        ))}
      </select>
      <input
        type="text"
        defaultValue={condition.values.join(', ')}
        placeholder="bijv. Ja"
        onBlur={(e) =>
          onChangeValues(
            e.target.value
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean)
          )
        }
      />
      <button type="button" className="rule-remove-condition" onClick={onRemove} title="Voorwaarde verwijderen">
        ✕
      </button>
    </div>
  )
}

export default RulesModal
