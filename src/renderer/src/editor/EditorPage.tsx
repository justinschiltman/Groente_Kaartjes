import { useProjectStore } from '@renderer/state/projectStore'
import CanvasEditor from './CanvasEditor'
import LayersPanel from './LayersPanel'
import PropertyInspector from './PropertyInspector'
import Toolbar from './Toolbar'
import { useFabricCanvas } from './useFabricCanvas'

function EditorPage(): React.JSX.Element {
  const canUndo = useProjectStore((state) => state.undoStack.length > 0)
  const canRedo = useProjectStore((state) => state.redoStack.length > 0)
  const {
    canvasElRef,
    guides,
    canvasSizePx,
    addText,
    addShape,
    deleteElement,
    duplicateElement,
    updateSelectedProperties,
    reorderElement,
    selectElement,
    undo,
    redo
  } = useFabricCanvas()

  return (
    <div className="editor-page">
      <Toolbar
        onAddText={addText}
        onAddRect={() => addShape('rect')}
        onAddEllipse={() => addShape('ellipse')}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <div className="editor-body">
        <LayersPanel onSelect={selectElement} onReorder={reorderElement} onDelete={deleteElement} />
        <CanvasEditor canvasElRef={canvasElRef} canvasSizePx={canvasSizePx} guides={guides} />
        <PropertyInspector onUpdate={updateSelectedProperties} onDelete={deleteElement} onDuplicate={duplicateElement} />
      </div>
    </div>
  )
}

export default EditorPage
