import { useEffect, useState } from 'react'
import { useEditorUiStore } from '@renderer/state/editorUiStore'
import { usePreviewProduct } from '@renderer/state/mergedData'
import { useProductStore } from '@renderer/state/productStore'
import { useProjectStore } from '@renderer/state/projectStore'
import type { Template } from '@shared/types/template'

interface DesignBarProps {
  onSwitchTemplate: (id: string) => void
  onAddTemplate: () => void
  onDuplicateTemplate: (id: string) => void
  onDeleteTemplate: (id: string) => void
  onOpenRules: () => void
  onOpenFieldMappings: () => void
}

function DesignBar({
  onSwitchTemplate,
  onAddTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onOpenRules,
  onOpenFieldMappings
}: DesignBarProps): React.JSX.Element {
  const templates = useProjectStore((state) => state.templates)
  const activeTemplateId = useProjectStore((state) => state.activeTemplateId)
  const renameTemplate = useProjectStore((state) => state.renameTemplate)
  const products = useProductStore((state) => state.products)
  const previewProduct = usePreviewProduct()
  const setPreviewProduct = useEditorUiStore((state) => state.setPreviewProduct)

  return (
    <div className="design-bar">
      <div className="template-tabs">
        {templates.map((template) => (
          <TemplateTab
            key={template.id}
            template={template}
            active={template.id === activeTemplateId}
            canDelete={templates.length > 1}
            onSelect={() => onSwitchTemplate(template.id)}
            onRename={(name) => renameTemplate(template.id, name)}
            onDuplicate={() => onDuplicateTemplate(template.id)}
            onDelete={() => onDeleteTemplate(template.id)}
          />
        ))}
        <button type="button" className="template-tab-add" onClick={onAddTemplate} title="Nieuw ontwerp">
          + Ontwerp
        </button>
      </div>

      <div className="data-controls">
        {products.length > 0 && (
          <label className="preview-product-field" title="Product waarmee het ontwerp hier wordt voorvertoond">
            <span>Voorbeeld:</span>
            <select value={previewProduct?.id ?? ''} onChange={(e) => setPreviewProduct(e.target.value || null)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || '(naamloos)'}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" onClick={onOpenFieldMappings}>
          Veldkoppelingen
        </button>
        <button type="button" onClick={onOpenRules}>
          Regels
        </button>
      </div>
    </div>
  )
}

interface TemplateTabProps {
  template: Template
  active: boolean
  canDelete: boolean
  onSelect: () => void
  onRename: (name: string) => void
  onDuplicate: () => void
  onDelete: () => void
}

function TemplateTab({ template, active, canDelete, onSelect, onRename, onDuplicate, onDelete }: TemplateTabProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(template.name)

  useEffect(() => {
    setName(template.name)
  }, [template.name])

  function commitRename(): void {
    setEditing(false)
    const trimmed = name.trim()
    if (trimmed && trimmed !== template.name) onRename(trimmed)
    else setName(template.name)
  }

  return (
    <div className={active ? 'template-tab active' : 'template-tab'}>
      {editing ? (
        <input
          className="template-tab-rename"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') {
              setName(template.name)
              setEditing(false)
            }
          }}
        />
      ) : (
        <button type="button" className="template-tab-label" onClick={onSelect} onDoubleClick={() => setEditing(true)}>
          {template.name}
        </button>
      )}
      <div className="template-tab-actions">
        <button type="button" title="Naam wijzigen" onClick={() => setEditing(true)}>
          ✎
        </button>
        <button type="button" title="Dupliceren" onClick={onDuplicate}>
          ⧉
        </button>
        {canDelete && (
          <button type="button" title="Verwijderen" onClick={onDelete}>
            🗑
          </button>
        )}
      </div>
    </div>
  )
}

export default DesignBar
