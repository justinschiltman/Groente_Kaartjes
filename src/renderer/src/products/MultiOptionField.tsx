import { useState } from 'react'
import type { MultiValueField } from '@shared/types/product'

interface MultiOptionFieldProps {
  label: string
  field: MultiValueField
  onAddOption: (value: string) => void
  onSetFavorite: (value: string) => void
  onRemoveOption: (value: string) => void
}

function MultiOptionField({ label, field, onAddOption, onSetFavorite, onRemoveOption }: MultiOptionFieldProps): React.JSX.Element {
  const [newValue, setNewValue] = useState('')

  function commitAdd(): void {
    const trimmed = newValue.trim()
    if (!trimmed) return
    onAddOption(trimmed)
    setNewValue('')
  }

  return (
    <div className="multi-option-field">
      <span className="multi-option-label">{label}</span>

      {field.options.length === 0 ? (
        <p className="empty-hint">Nog geen waarden opgeslagen.</p>
      ) : (
        <ul className="multi-option-list">
          {field.options.map((option) => (
            <li key={option} className={option === field.favorite ? 'multi-option active' : 'multi-option'}>
              <button type="button" className="multi-option-select" onClick={() => onSetFavorite(option)} title="Als favoriet instellen">
                <span className="multi-option-star">{option === field.favorite ? '★' : '☆'}</span>
                <span className="multi-option-text">{option}</span>
              </button>
              <button type="button" className="multi-option-remove" onClick={() => onRemoveOption(option)} title="Verwijderen">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="multi-option-add">
        <textarea
          value={newValue}
          rows={1}
          placeholder="Nieuwe waarde… (Enter voor een regeleinde)"
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => {
            // Plain Enter inserts a line break (e.g. a "Tekst onder" bound to a box that vult het vak
            // over 2 regels) — Ctrl/Cmd+Enter is a shortcut for the "+ Toevoegen" button below.
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              commitAdd()
            }
          }}
        />
        <button type="button" onClick={commitAdd}>
          + Toevoegen
        </button>
      </div>
    </div>
  )
}

export default MultiOptionField
