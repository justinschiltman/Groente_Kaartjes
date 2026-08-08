interface ToolbarProps {
  onAddText: () => void
  onAddRect: () => void
  onAddEllipse: () => void
  onImportFont: () => void
  importingFont: boolean
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
}

function Toolbar({
  onAddText,
  onAddRect,
  onAddEllipse,
  onImportFont,
  importingFont,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset
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
      </div>
      <div className="toolbar-group">
        <div className="zoom-controls">
          <button type="button" onClick={onZoomOut} title="Uitzoomen">
            −
          </button>
          <button type="button" className="zoom-level" onClick={onZoomReset} title="Zoom resetten naar 100%">
            {Math.round(zoom * 100)}%
          </button>
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

export default Toolbar
