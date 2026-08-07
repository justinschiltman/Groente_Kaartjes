import { useEffect, useState } from 'react'
import { useEditorUiStore } from '@renderer/state/editorUiStore'
import { useProjectStore } from '@renderer/state/projectStore'
import type { CardElement, ElementPatch } from '@shared/types/template'

const WEB_SAFE_FONTS = ['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Courier New']

interface PropertyInspectorProps {
  onUpdate: (patch: ElementPatch) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

function PropertyInspector({ onUpdate, onDelete, onDuplicate }: PropertyInspectorProps): React.JSX.Element {
  const selectedElementId = useEditorUiStore((state) => state.selectedElementId)
  const element = useProjectStore((state) => state.template.elements.find((el) => el.id === selectedElementId))

  if (!element) {
    return (
      <div className="property-inspector">
        <h2>Eigenschappen</h2>
        <p className="empty-hint">Selecteer een element om de eigenschappen te bewerken.</p>
      </div>
    )
  }

  return (
    <div className="property-inspector">
      <h2>Eigenschappen</h2>
      <PropertyForm key={element.id} element={element} onUpdate={onUpdate} />
      <div className="property-actions">
        <button type="button" onClick={() => onDuplicate(element.id)}>
          Dupliceren
        </button>
        <button type="button" className="danger" onClick={() => onDelete(element.id)}>
          Verwijderen
        </button>
      </div>
    </div>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  step?: number
  onCommit: (value: number) => void
}

function NumberField({ label, value, step = 1, onCommit }: NumberFieldProps): React.JSX.Element {
  const [local, setLocal] = useState(() => String(Math.round(value * 100) / 100))

  useEffect(() => {
    setLocal(String(Math.round(value * 100) / 100))
  }, [value])

  function commit(): void {
    const parsed = parseFloat(local)
    if (!Number.isNaN(parsed)) onCommit(parsed)
    else setLocal(String(value))
  }

  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
      />
    </label>
  )
}

function PropertyForm({ element, onUpdate }: { element: CardElement; onUpdate: (patch: ElementPatch) => void }): React.JSX.Element {
  return (
    <div className="property-form">
      <div className="field-row">
        <NumberField label="X (mm)" value={element.x} onCommit={(x) => onUpdate({ x })} />
        <NumberField label="Y (mm)" value={element.y} onCommit={(y) => onUpdate({ y })} />
      </div>
      <div className="field-row">
        <NumberField label="Breedte (mm)" value={element.width} onCommit={(width) => onUpdate({ width })} />
        <NumberField label="Hoogte (mm)" value={element.height} onCommit={(height) => onUpdate({ height })} />
      </div>
      <NumberField label="Rotatie (graden)" value={element.rotation} onCommit={(rotation) => onUpdate({ rotation })} />

      {element.type === 'text' && <TextFields element={element} onUpdate={onUpdate} />}
      {element.type === 'shape' && <ShapeFields element={element} onUpdate={onUpdate} />}
    </div>
  )
}

function TextFields({
  element,
  onUpdate
}: {
  element: Extract<CardElement, { type: 'text' }>
  onUpdate: (patch: ElementPatch) => void
}): React.JSX.Element {
  const [text, setText] = useState(element.text)

  return (
    <>
      <label className="field">
        <span>Tekst</span>
        <textarea
          value={text}
          rows={2}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => onUpdate({ text })}
        />
      </label>

      <label className="field">
        <span>Lettertype</span>
        <select value={element.fontFamily} onChange={(e) => onUpdate({ fontFamily: e.target.value })}>
          {WEB_SAFE_FONTS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </label>

      <div className="field-row">
        <NumberField label="Grootte (pt)" value={element.fontSize} onCommit={(fontSize) => onUpdate({ fontSize })} />
        <label className="field">
          <span>Opmaak</span>
          <select
            value={element.formatAs}
            onChange={(e) => onUpdate({ formatAs: e.target.value as 'text' | 'currency' | 'number' })}
          >
            <option value="text">Tekst</option>
            <option value="currency">Bedrag (€)</option>
            <option value="number">Getal</option>
          </select>
        </label>
      </div>

      <div className="field-row toggle-row">
        <button
          type="button"
          className={element.fontWeight === 'bold' ? 'toggle active' : 'toggle'}
          onClick={() => onUpdate({ fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' })}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={element.fontStyle === 'italic' ? 'toggle active' : 'toggle'}
          onClick={() => onUpdate({ fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' })}
        >
          <em>I</em>
        </button>
        {(['left', 'center', 'right'] as const).map((align) => (
          <button
            key={align}
            type="button"
            className={element.align === align ? 'toggle active' : 'toggle'}
            onClick={() => onUpdate({ align })}
          >
            {align === 'left' ? '⇤' : align === 'center' ? '⇔' : '⇥'}
          </button>
        ))}
      </div>

      <label className="field">
        <span>Kleur</span>
        <input type="color" value={element.color} onChange={(e) => onUpdate({ color: e.target.value })} />
      </label>
    </>
  )
}

function ShapeFields({
  element,
  onUpdate
}: {
  element: Extract<CardElement, { type: 'shape' }>
  onUpdate: (patch: ElementPatch) => void
}): React.JSX.Element {
  return (
    <>
      <label className="field">
        <span>Vulkleur</span>
        <input type="color" value={element.fill} onChange={(e) => onUpdate({ fill: e.target.value })} />
      </label>
      <label className="field">
        <span>Lijnkleur</span>
        <input type="color" value={element.stroke ?? '#000000'} onChange={(e) => onUpdate({ stroke: e.target.value })} />
      </label>
      <div className="field-row">
        <NumberField
          label="Lijndikte (mm)"
          value={element.strokeWidth}
          step={0.1}
          onCommit={(strokeWidth) => onUpdate({ strokeWidth })}
        />
        {element.shape === 'rect' && (
          <NumberField
            label="Ronding (mm)"
            value={element.cornerRadius ?? 0}
            onCommit={(cornerRadius) => onUpdate({ cornerRadius })}
          />
        )}
      </div>
    </>
  )
}

export default PropertyInspector
