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
  canRedo
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
