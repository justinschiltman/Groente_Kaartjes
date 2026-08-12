import { useEffect, useState } from 'react'
import { useAssetStore } from '@renderer/state/assetStore'
import { useDataStore } from '@renderer/state/dataStore'
import { useEditorUiStore } from '@renderer/state/editorUiStore'
import { useActiveTemplate, useProjectStore } from '@renderer/state/projectStore'
import { resolveBoundText } from '@shared/dataBinding'
import { DEFAULT_CARD_HEIGHT_MM, DEFAULT_CARD_WIDTH_MM } from '@shared/constants'
import type { CardElement, ElementPatch } from '@shared/types/template'

const WEB_SAFE_FONTS = ['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Courier New']

interface PropertyInspectorProps {
  onUpdate: (patch: ElementPatch) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onSetCardSize: (widthMm: number, heightMm: number) => void
}

function PropertyInspector({ onUpdate, onDelete, onDuplicate, onSetCardSize }: PropertyInspectorProps): React.JSX.Element {
  const selectedElementId = useEditorUiStore((state) => state.selectedElementId)
  const element = useActiveTemplate().elements.find((el) => el.id === selectedElementId)

  if (!element) {
    return <CardSettingsPanel onSetCardSize={onSetCardSize} />
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

function CardSettingsPanel({
  onSetCardSize
}: {
  onSetCardSize: (widthMm: number, heightMm: number) => void
}): React.JSX.Element {
  const cardWidthMm = useProjectStore((state) => state.cardWidthMm)
  const cardHeightMm = useProjectStore((state) => state.cardHeightMm)

  return (
    <div className="property-inspector">
      <h2>Kaartinstellingen</h2>
      <p className="empty-hint">
        Selecteer een element om de eigenschappen te bewerken, of pas hier de kaart zelf aan. Deze grootte geldt voor
        elk ontwerp — bij het exporteren komen er steeds 3 kaarten onder elkaar op één A4-pagina.
      </p>

      <div className="property-form">
        <div className="field-row">
          <NumberField label="Breedte (mm)" value={cardWidthMm} onCommit={(w) => onSetCardSize(w, cardHeightMm)} />
          <NumberField label="Hoogte (mm)" value={cardHeightMm} onCommit={(h) => onSetCardSize(cardWidthMm, h)} />
        </div>
        <button type="button" onClick={() => onSetCardSize(DEFAULT_CARD_WIDTH_MM, DEFAULT_CARD_HEIGHT_MM)}>
          Standaardgrootte (⅓ A4 — {DEFAULT_CARD_WIDTH_MM} × {Math.round(DEFAULT_CARD_HEIGHT_MM)} mm)
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

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

interface ColorFieldProps {
  label: string
  value: string
  onCommit: (value: string) => void
}

function ColorField({ label, value, onCommit }: ColorFieldProps): React.JSX.Element {
  const [hexText, setHexText] = useState(value)

  useEffect(() => {
    setHexText(value)
  }, [value])

  function commitHexText(): void {
    if (HEX_COLOR_PATTERN.test(hexText)) onCommit(hexText)
    else setHexText(value)
  }

  return (
    <label className="field">
      <span>{label}</span>
      <div className="color-field">
        <input
          type="color"
          value={HEX_COLOR_PATTERN.test(hexText) ? hexText : value}
          onChange={(e) => {
            setHexText(e.target.value)
            onCommit(e.target.value)
          }}
        />
        <input
          type="text"
          className="hex-input"
          value={hexText}
          spellCheck={false}
          onChange={(e) => setHexText(e.target.value)}
          onBlur={commitHexText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
        />
      </div>
    </label>
  )
}

function FontFamilyField({ value, onCommit }: { value: string; onCommit: (value: string) => void }): React.JSX.Element {
  const importedFonts = useAssetStore((state) => state.fontFamilies)

  return (
    <label className="field">
      <span>Lettertype</span>
      <select value={value} onChange={(e) => onCommit(e.target.value)}>
        {importedFonts.length > 0 && (
          <optgroup label="Geïmporteerd">
            {importedFonts.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label="Systeem">
          {WEB_SAFE_FONTS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </optgroup>
      </select>
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
  const headers = useDataStore((state) => state.headers)
  const rows = useDataStore((state) => state.rows)
  const previewRowIndex = useDataStore((state) => state.previewRowIndex)

  return (
    <>
      <label className="field">
        <span>Koppel aan kolom</span>
        <select value={element.bindingKey ?? ''} onChange={(e) => onUpdate({ bindingKey: e.target.value || undefined })}>
          <option value="">Geen (vaste tekst)</option>
          {headers.map((header) => (
            <option key={header} value={header}>
              {header}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>{element.bindingKey ? 'Vaste tekst (terugval als leeg)' : 'Tekst'}</span>
        <textarea
          value={text}
          rows={2}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => onUpdate({ text })}
        />
      </label>

      {element.bindingKey && (
        <p className="binding-preview">
          {rows.length > 0 ? (
            <>
              Voorbeeld (rij {previewRowIndex + 1} van {rows.length}):{' '}
              <strong>{resolveBoundText(element, rows[previewRowIndex]) || '(leeg)'}</strong>
            </>
          ) : (
            'Importeer een Excel-bestand om een voorbeeld te zien.'
          )}
        </p>
      )}

      <FontFamilyField value={element.fontFamily} onCommit={(fontFamily) => onUpdate({ fontFamily })} />

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

      <ColorField label="Kleur" value={element.color} onCommit={(color) => onUpdate({ color })} />
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
      <ColorField label="Vulkleur" value={element.fill} onCommit={(fill) => onUpdate({ fill })} />
      <ColorField label="Lijnkleur" value={element.stroke ?? '#000000'} onCommit={(stroke) => onUpdate({ stroke })} />
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
