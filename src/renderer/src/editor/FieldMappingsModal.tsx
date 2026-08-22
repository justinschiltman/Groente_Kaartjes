import { useDataStore } from '@renderer/state/dataStore'
import { useAvailableFields, mergeCurrentProducts } from '@renderer/state/mergedData'
import { useProjectStore } from '@renderer/state/projectStore'
import { resolveBoundText } from '@shared/dataBinding'
import type { TextElement } from '@shared/types/template'

interface FieldMappingsModalProps {
  onClose: () => void
  onSetBinding: (templateId: string, elementId: string, bindingKey: string | undefined) => void
}

const FORMAT_LABELS: Record<TextElement['formatAs'], string> = {
  text: 'Tekst',
  currency: 'Bedrag (€)',
  number: 'Getal'
}

function FieldMappingsModal({ onClose, onSetBinding }: FieldMappingsModalProps): React.JSX.Element {
  const templates = useProjectStore((state) => state.templates)
  const availableFields = useAvailableFields()
  const headers = useDataStore((state) => state.headers)
  const rows = useDataStore((state) => state.rows)
  const previewRowIndex = useDataStore((state) => state.previewRowIndex)
  const rawPreviewRow = rows[previewRowIndex]
  const previewRow = rawPreviewRow ? mergeCurrentProducts(rawPreviewRow) : rawPreviewRow

  const hasAnyTextElement = templates.some((t) => t.elements.some((el) => el.type === 'text'))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Veldkoppelingen</h2>
          <button type="button" onClick={onClose} title="Sluiten">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="empty-hint">
            Koppel hier in één keer elk tekstveld van elk ontwerp aan een productveld of een kolom uit je
            Excel-bestand. Deze koppelingen worden onthouden totdat je ze hier zelf wijzigt.
          </p>

          {!hasAnyTextElement && (
            <p className="empty-hint">Je hebt nog geen tekstvelden toegevoegd aan een ontwerp.</p>
          )}

          {headers.length === 0 && (
            <p className="empty-hint">
              Productvelden zoals Naam en Weegschaalcode kun je nu al koppelen. Kolommen uit je
              prijslijst — zoals Prijs, en de hele-euro's/centen-varianten daarvan — verschijnen hier pas
              nadat je bij Ontwerpen een Excel-bestand hebt geïmporteerd.
            </p>
          )}

          {templates.map((template) => {
            const textElements = template.elements.filter(
              (el): el is TextElement => el.type === 'text'
            )
            if (textElements.length === 0) return null
            return (
              <div key={template.id}>
                <h3>{template.name}</h3>
                <table className="rules-table">
                  <thead>
                    <tr>
                      <th>Tekstveld</th>
                      <th>Opmaak</th>
                      <th>Kolom</th>
                      <th>Voorbeeld</th>
                    </tr>
                  </thead>
                  <tbody>
                    {textElements.map((el) => (
                      <tr key={el.id}>
                        <td>{el.text.trim() || '(leeg tekstveld)'}</td>
                        <td>{FORMAT_LABELS[el.formatAs]}</td>
                        <td>
                          <select
                            value={el.bindingKey ?? ''}
                            onChange={(e) => onSetBinding(template.id, el.id, e.target.value || undefined)}
                          >
                            <option value="">Geen (vaste tekst)</option>
                            {availableFields.map((field) => (
                              <option key={field} value={field}>
                                {field}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {el.bindingKey ? (previewRow ? resolveBoundText(el, previewRow) || '(leeg)' : '—') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default FieldMappingsModal
