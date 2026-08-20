import { useCallback, useState } from 'react'
import { importFonts as importFontsAndRegister } from '@renderer/assets/fontLoader'
import { useAssetStore } from '@renderer/state/assetStore'
import { useDataStore } from '@renderer/state/dataStore'
import { useProjectStore } from '@renderer/state/projectStore'
import CanvasEditor from './CanvasEditor'
import DesignBar from './DesignBar'
import FieldMappingsModal from './FieldMappingsModal'
import ImageLibraryModal from './ImageLibraryModal'
import LayersPanel from './LayersPanel'
import PropertyInspector from './PropertyInspector'
import RulesModal from './RulesModal'
import Toolbar from './Toolbar'
import { useFabricCanvas } from './useFabricCanvas'

const ZOOM_MIN = 0.25
const ZOOM_MAX = 3
const ZOOM_STEP = 1.25

function EditorPage(): React.JSX.Element {
  const canUndo = useProjectStore((state) => state.undoStack.length > 0)
  const canRedo = useProjectStore((state) => state.redoStack.length > 0)
  const setFontFamilies = useAssetStore((state) => state.setFontFamilies)
  const setImportedSheet = useDataStore((state) => state.setImportedSheet)
  const [importingFont, setImportingFont] = useState(false)
  const [importingExcel, setImportingExcel] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [fieldMappingsOpen, setFieldMappingsOpen] = useState(false)
  const [imageLibraryOpen, setImageLibraryOpen] = useState(false)
  const [zoom, setZoom] = useState(1)

  const zoomIn = useCallback(() => setZoom((z) => Math.min(ZOOM_MAX, z * ZOOM_STEP)), [])
  const zoomOut = useCallback(() => setZoom((z) => Math.max(ZOOM_MIN, z / ZOOM_STEP)), [])
  const setZoomExact = useCallback((next: number) => setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))), [])

  const handleWheelZoom = useCallback((event: React.WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * (event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP))))
  }, [])
  const {
    canvasElRef,
    viewportElRef,
    guides: snapGuides,
    canvasSizePx,
    addText,
    addShape,
    addImage,
    deleteElement,
    duplicateElement,
    updateSelectedProperties,
    setElementBinding,
    reorderElement,
    selectElement,
    setCardSizeMm,
    switchTemplate,
    addTemplate,
    duplicateTemplate,
    deleteTemplate,
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

  async function handleImportExcel(): Promise<void> {
    setImportingExcel(true)
    try {
      const sheet = await window.api.importExcel()
      if (sheet) setImportedSheet(sheet)
    } finally {
      setImportingExcel(false)
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
        onOpenImageLibrary={() => setImageLibraryOpen(true)}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        zoom={zoom}
        zoomMin={ZOOM_MIN}
        zoomMax={ZOOM_MAX}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onSetZoom={setZoomExact}
      />
      <DesignBar
        onSwitchTemplate={switchTemplate}
        onAddTemplate={addTemplate}
        onDuplicateTemplate={duplicateTemplate}
        onDeleteTemplate={deleteTemplate}
        onImportExcel={handleImportExcel}
        importingExcel={importingExcel}
        onOpenRules={() => setRulesOpen(true)}
        onOpenFieldMappings={() => setFieldMappingsOpen(true)}
      />
      <div className="editor-body">
        <LayersPanel onSelect={selectElement} onReorder={reorderElement} onDelete={deleteElement} />
        <CanvasEditor
          canvasElRef={canvasElRef}
          viewportElRef={viewportElRef}
          canvasSizePx={canvasSizePx}
          snapGuides={snapGuides}
          zoom={zoom}
          onWheel={handleWheelZoom}
        />
        <PropertyInspector
          onUpdate={updateSelectedProperties}
          onDelete={deleteElement}
          onDuplicate={duplicateElement}
          onSetCardSize={setCardSizeMm}
        />
      </div>
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
      {fieldMappingsOpen && (
        <FieldMappingsModal onClose={() => setFieldMappingsOpen(false)} onSetBinding={setElementBinding} />
      )}
      {imageLibraryOpen && (
        <ImageLibraryModal onClose={() => setImageLibraryOpen(false)} onPlaceImage={addImage} />
      )}
    </div>
  )
}

export default EditorPage
