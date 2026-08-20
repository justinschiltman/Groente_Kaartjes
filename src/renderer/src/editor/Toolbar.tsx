import { useEffect, useState } from 'react'

interface ToolbarProps {
  onAddText: () => void
  onAddRect: () => void
  onAddEllipse: () => void
  onImportFont: () => void
  importingFont: boolean
  onOpenImageLibrary: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  zoom: number
  zoomMin: number
  zoomMax: number
  onZoomIn: () => void
  onZoomOut: () => void
  onSetZoom: (zoom: number) => void
}

function Toolbar({
  onAddText,
  onAddRect,
  onAddEllipse,
  onImportFont,
  importingFont,
  onOpenImageLibrary,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  zoomMin,
  zoomMax,
  onZoomIn,
  onZoomOut,
  onSetZoom
}: ToolbarProps): React.JSX.Element {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button type="button" onClick={onAddText}>
          + Tekst
        </button>
        <button type="button" onClick={onAddRect}>
          + Rechthoek
        </button>
        <button type="button" onClick={onAddEllipse}>
          + Ellips
        </button>
        <button type="button" onClick={onImportFont} disabled={importingFont}>
          {importingFont ? 'Bezig…' : '+ Lettertype importeren'}
        </button>
        <button type="button" onClick={onOpenImageLibrary}>
          + Afbeelding
        </button>
      </div>
      <div className="toolbar-group">
        <div className="zoom-controls">
          <button type="button" onClick={onZoomOut} title="Uitzoomen">
            −
          </button>
          <ZoomField zoom={zoom} zoomMin={zoomMin} zoomMax={zoomMax} onSetZoom={onSetZoom} />
          <button type="button" onClick={onZoomIn} title="Inzoomen">
            +
          </button>
        </div>
        <button type="button" onClick={onUndo} disabled={!canUndo} title="Ongedaan maken (Ctrl+Z)">
          ↶ Ongedaan maken
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo} title="Opnieuw (Ctrl+Y)">
          ↷ Opnieuw
        </button>
      </div>
    </div>
  )
}

interface ZoomFieldProps {
  zoom: number
  zoomMin: number
  zoomMax: number
  onSetZoom: (zoom: number) => void
}

function ZoomField({ zoom, zoomMin, zoomMax, onSetZoom }: ZoomFieldProps): React.JSX.Element {
  const [local, setLocal] = useState(() => String(Math.round(zoom * 100)))

  useEffect(() => {
    setLocal(String(Math.round(zoom * 100)))
  }, [zoom])

  function commit(): void {
    const parsed = parseFloat(local)
    if (!Number.isNaN(parsed)) {
      onSetZoom(Math.min(zoomMax, Math.max(zoomMin, parsed / 100)))
    } else {
      setLocal(String(Math.round(zoom * 100)))
    }
  }

  return (
    <label className="zoom-field" title="Zoomniveau">
      <input
        type="text"
        inputMode="numeric"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
      />
      <span>%</span>
    </label>
  )
}

export default Toolbar
