import { useState } from 'react'
import { importFonts as importFontsAndRegister } from '@renderer/assets/fontLoader'
import { useAssetStore } from '@renderer/state/assetStore'
import { useProjectStore } from '@renderer/state/projectStore'
import CanvasEditor from './CanvasEditor'
import LayersPanel from './LayersPanel'
import PropertyInspector from './PropertyInspector'
import Toolbar from './Toolbar'
import { useFabricCanvas } from './useFabricCanvas'

function EditorPage(): React.JSX.Element {
  const canUndo = useProjectStore((state) => state.undoStack.length > 0)
  const canRedo = useProjectStore((state) => state.redoStack.length > 0)
  const guides = useProjectStore((state) => state.template.guides)
  const setFontFamilies = useAssetStore((state) => state.setFontFamilies)
  const [importingFont, setImportingFont] = useState(false)
  const {
    canvasElRef,
    guides: snapGuides,
    canvasSizePx,
    addText,
    addShape,
    deleteElement,
    duplicateElement,
    updateSelectedProperties,
    reorderElement,
    selectElement,
    setCardSizeMm,
    undo,
    redo
  } = useFabricCanvas()

  async function handleImportFont(): Promise<void> {
    setImportingFont(true)
    try {
      const families = await importFontsAndRegister()
      setFontFamilies(families)
    } finally {
      setImportingFont(false)
    }
  }

  return (
    <div className="editor-page">
      <Toolbar
        onAddText={addText}
        onAddRect={() => addShape('rect')}
        onAddEllipse={() => addShape('ellipse')}
        onImportFont={handleImportFont}
        importingFont={importingFont}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <div className="editor-body">
        <LayersPanel onSelect={selectElement} onReorder={reorderElement} onDelete={deleteElement} />
        <CanvasEditor canvasElRef={canvasElRef} canvasSizePx={canvasSizePx} snapGuides={snapGuides} layoutGuides={guides} />
        <PropertyInspector
          onUpdate={updateSelectedProperties}
          onDelete={deleteElement}
          onDuplicate={duplicateElement}
          onSetCardSize={setCardSizeMm}
        />
      </div>
    </div>
  )
}

export default EditorPage
