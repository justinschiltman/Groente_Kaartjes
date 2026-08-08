import { useEditorUiStore } from '@renderer/state/editorUiStore'
import { useActiveTemplate } from '@renderer/state/projectStore'
import type { CardElement } from '@shared/types/template'

interface LayersPanelProps {
  onSelect: (id: string) => void
  onReorder: (id: string, direction: 'up' | 'down' | 'front' | 'back') => void
  onDelete: (id: string) => void
}

function layerLabel(element: CardElement): string {
  if (element.type === 'text') return element.text.trim() || 'Tekst'
  if (element.type === 'shape') return element.shape === 'rect' ? 'Rechthoek' : 'Ellips'
  return 'Afbeelding'
}

function layerIcon(element: CardElement): string {
  if (element.type === 'text') return 'T'
  if (element.type === 'shape') return element.shape === 'rect' ? '▭' : '◯'
  return '🖼'
}

function LayersPanel({ onSelect, onReorder, onDelete }: LayersPanelProps): React.JSX.Element {
  const elements = useActiveTemplate().elements
  const selectedElementId = useEditorUiStore((state) => state.selectedElementId)
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex)

  return (
    <div className="layers-panel">
      <h2>Lagen</h2>
      {sorted.length === 0 && <p className="empty-hint">Nog geen elementen. Voeg er een toe via de werkbalk.</p>}
      <ul>
        {sorted.map((element, index) => (
          <li key={element.id} className={element.id === selectedElementId ? 'layer-row selected' : 'layer-row'}>
            <button type="button" className="layer-select" onClick={() => onSelect(element.id)}>
              <span className="layer-icon">{layerIcon(element)}</span>
              <span className="layer-label">{layerLabel(element)}</span>
            </button>
            <div className="layer-actions">
              <button
                type="button"
                title="Helemaal naar voren"
                disabled={index === 0}
                onClick={() => onReorder(element.id, 'front')}
              >
                ⤒
              </button>
              <button
                type="button"
                title="Eén naar voren"
                disabled={index === 0}
                onClick={() => onReorder(element.id, 'up')}
              >
                ↑
              </button>
              <button
                type="button"
                title="Eén naar achteren"
                disabled={index === sorted.length - 1}
                onClick={() => onReorder(element.id, 'down')}
              >
                ↓
              </button>
              <button
                type="button"
                title="Helemaal naar achteren"
                disabled={index === sorted.length - 1}
                onClick={() => onReorder(element.id, 'back')}
              >
                ⤓
              </button>
              <button type="button" title="Verwijderen" onClick={() => onDelete(element.id)}>
                🗑
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default LayersPanel
