import { useState } from 'react'
import type { MultiValueField } from '@shared/types/product'

interface MultiOptionFieldProps {
  label: string
  field: MultiValueField
  onAddOption: (value: string) => void
  onSetFavorite: (value: string) => void
  onRemoveOption: (value: string) => void
  onRenameOption: (oldValue: string, newValue: string) => void
  /** Only "Tekst onder" needs this (typing a manual line break lets a designer's lineCountVariant
   * elements pick which one to show — see TextElement.lineCountVariant) — every other multi-option
   * field (Top tekst, Land van herkomst) keeps the plain single-line input, Enter-to-add. */
  allowLineBreaks?: boolean
}

function MultiOptionField({
  label,
  field,
  onAddOption,
  onSetFavorite,
  onRemoveOption,
  onRenameOption,
  allowLineBreaks
}: MultiOptionFieldProps): React.JSX.Element {
  const [newValue, setNewValue] = useState('')
  // The option currently being edited in place — null when none is (the normal state). Tracked by its
  // own text rather than an index, since options have no separate id and the text IS the identity.
  const [editingOption, setEditingOption] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  function commitAdd(): void {
    const trimmed = newValue.trim()
    if (!trimmed) return
    onAddOption(trimmed)
    setNewValue('')
  }

  function startEdit(option: string): void {
    setEditingOption(option)
    setEditText(option)
  }

  function commitEdit(): void {
    if (editingOption === null) return
    const trimmed = editText.trim()
    if (trimmed && trimmed !== editingOption) onRenameOption(editingOption, trimmed)
    setEditingOption(null)
  }

  return (
    <div className="multi-option-field">
      <span className="multi-option-label">{label}</span>

      {field.options.length === 0 ? (
        <p className="empty-hint">Nog geen waarden opgeslagen.</p>
      ) : (
        <ul className="multi-option-list">
          {field.options.map((option) =>
            editingOption === option ? (
              <li key={option} className="multi-option editing">
                {allowLineBreaks ? (
                  <textarea
                    className="multi-option-edit-input"
                    autoFocus
                    rows={1}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault()
                        commitEdit()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        setEditingOption(null)
                      }
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    className="multi-option-edit-input"
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        commitEdit()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        setEditingOption(null)
                      }
                    }}
                  />
                )}
              </li>
            ) : (
              <li key={option} className={option === field.favorite ? 'multi-option active' : 'multi-option'}>
                <button type="button" className="multi-option-select" onClick={() => onSetFavorite(option)} title="Als favoriet instellen">
                  <span className="multi-option-star">{option === field.favorite ? '★' : '☆'}</span>
                  <span className="multi-option-text">{option}</span>
                </button>
                <button type="button" className="multi-option-edit" onClick={() => startEdit(option)} title="Bewerken">
                  ✎
                </button>
                <button type="button" className="multi-option-remove" onClick={() => onRemoveOption(option)} title="Verwijderen">
                  ✕
                </button>
              </li>
            )
          )}
        </ul>
      )}

      <div className="multi-option-add">
        {allowLineBreaks ? (
          <textarea
            value={newValue}
            rows={1}
            placeholder="Nieuwe waarde… (Enter voor een regeleinde)"
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              // Plain Enter inserts a line break (e.g. a box that "vult het vak" over 2 regels) —
              // Ctrl/Cmd+Enter is a shortcut for the "+ Toevoegen" button below.
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                commitAdd()
              }
            }}
          />
        ) : (
          <input
            type="text"
            value={newValue}
            placeholder="Nieuwe waarde…"
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitAdd()
              }
            }}
          />
        )}
        <button type="button" onClick={commitAdd}>
          + Toevoegen
        </button>
      </div>
    </div>
  )
}

export default MultiOptionField
