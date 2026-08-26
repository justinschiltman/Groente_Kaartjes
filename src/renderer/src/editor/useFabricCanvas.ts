import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, Textbox } from 'fabric'
import type { ImageAsset } from '@renderer/assets/imageLoader'
import { getActiveTemplate, useProjectStore } from '@renderer/state/projectStore'
import { useAssetStore } from '@renderer/state/assetStore'
import { useEditorUiStore } from '@renderer/state/editorUiStore'
import { getPreviewRow } from '@renderer/state/mergedData'
import { useProductStore } from '@renderer/state/productStore'
import { resolveBoundText } from '@shared/dataBinding'
import type { ElementPatch, ShapeKind } from '@shared/types/template'
import { createImageElement, createShapeElement, createTextElement } from './elementFactory'
import {
  applyPatchToFabricObject,
  buildFabricObject,
  findObjectByElementId,
  fitTextToWidth,
  readGeometryPatch,
  readTextPatch,
  type TaggedFabricObject
} from './fabricSync'
import { computeSnapAdjustment, type SnapGuide } from './snapping'
import { editorUnits, mmToPx } from './units'

export interface UseFabricCanvasResult {
  canvasElRef: React.RefObject<HTMLCanvasElement | null>
  viewportElRef: React.RefObject<HTMLDivElement | null>
  guides: SnapGuide[]
  canvasSizePx: { width: number; height: number }
  addText: () => void
  addShape: (shape: ShapeKind) => void
  addImage: (asset: ImageAsset) => void
  deleteElement: (id: string) => void
  duplicateElement: (id: string) => void
  updateSelectedProperties: (patch: ElementPatch) => void
  setElementBinding: (templateId: string, elementId: string, bindingKey: string | undefined) => void
  reorderElement: (id: string, direction: 'up' | 'down' | 'front' | 'back') => void
  selectElement: (id: string | null) => void
  setCardSizeMm: (widthMm: number, heightMm: number) => void
  switchTemplate: (templateId: string) => void
  addTemplate: () => void
  duplicateTemplate: (id: string) => void
  deleteTemplate: (id: string) => void
  undo: () => void
  redo: () => void
}

export function useFabricCanvas(): UseFabricCanvasResult {
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const viewportElRef = useRef<HTMLDivElement>(null)
  const fabricCanvasRef = useRef<Canvas | null>(null)
  const [guides, setGuides] = useState<SnapGuide[]>([])
  const [canvasSizePx, setCanvasSizePx] = useState(() => {
    const { cardWidthMm, cardHeightMm } = useProjectStore.getState()
    return { width: mmToPx(cardWidthMm), height: mmToPx(cardHeightMm) }
  })

  // For every bound text element on canvas, shows the current preview row's value (formatted per
  // formatAs) instead of its static text — falls back to the static text when unbound or no preview
  // product is available. Deliberately a lightweight in-place update (not a rehydrate) so switching
  // the preview product doesn't disturb the current selection.
  const applyPreviewData = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    const template = getActiveTemplate()
    const row = getPreviewRow()
    const { cardHeightMm } = useProjectStore.getState()
    canvas.getObjects().forEach((obj) => {
      const tagged = obj as TaggedFabricObject
      const element = template.elements.find((el) => el.id === tagged.elementId)
      if (element?.type === 'text') {
        const resolved = resolveBoundText(element, row)
        obj.set('text', resolved !== null ? resolved : element.text)
        if (obj instanceof Textbox) fitTextToWidth(obj, element, editorUnits, cardHeightMm)
      }
    })
    canvas.requestRenderAll()
  }, [])

  // Rebuilds every fabric object from the store for the CURRENT active template. Used for
  // mount/undo/redo/reorder/template-switch — never wired to a generic store subscription, so
  // canvas-originated commits don't trigger a redundant rebuild.
  const rehydrate = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    // Captured before clear() — clear() synchronously fires 'selection:cleared', which would
    // otherwise reset the store's selection before we get a chance to read and restore it.
    const selectedId = useEditorUiStore.getState().selectedElementId
    const template = getActiveTemplate()
    canvas.clear()
    canvas.backgroundColor = template.backgroundColor
    const sorted = [...template.elements].sort((a, b) => a.zIndex - b.zIndex)
    sorted.forEach((element) => canvas.add(buildFabricObject(element)))

    const selectedObj = selectedId ? findObjectByElementId(canvas.getObjects(), selectedId) : undefined
    if (selectedObj) canvas.setActiveObject(selectedObj)
    useEditorUiStore.getState().select(selectedObj ? selectedId : null)

    canvas.requestRenderAll()
    applyPreviewData()
  }, [applyPreviewData])

  const addText = useCallback(() => {
    const template = getActiveTemplate()
    const { cardWidthMm, cardHeightMm } = useProjectStore.getState()
    const element = createTextElement(template.elements, cardWidthMm, cardHeightMm)
    useProjectStore.getState().addElement(element)
    const canvas = fabricCanvasRef.current
    if (canvas) {
      const obj = buildFabricObject(element)
      canvas.add(obj)
      canvas.setActiveObject(obj)
      canvas.requestRenderAll()
    }
    useEditorUiStore.getState().select(element.id)
  }, [])

  const addShape = useCallback((shape: ShapeKind) => {
    const template = getActiveTemplate()
    const { cardWidthMm, cardHeightMm } = useProjectStore.getState()
    const element = createShapeElement(template.elements, cardWidthMm, cardHeightMm, shape)
    useProjectStore.getState().addElement(element)
    const canvas = fabricCanvasRef.current
    if (canvas) {
      const obj = buildFabricObject(element)
      canvas.add(obj)
      canvas.setActiveObject(obj)
      canvas.requestRenderAll()
    }
    useEditorUiStore.getState().select(element.id)
  }, [])

  const addImage = useCallback((asset: ImageAsset) => {
    const template = getActiveTemplate()
    const { cardWidthMm, cardHeightMm } = useProjectStore.getState()
    const element = createImageElement(template.elements, cardWidthMm, cardHeightMm, {
      id: asset.id,
      naturalWidth: asset.imgEl.naturalWidth,
      naturalHeight: asset.imgEl.naturalHeight
    })
    useProjectStore.getState().addElement(element)
    const canvas = fabricCanvasRef.current
    if (canvas) {
      const obj = buildFabricObject(element)
      canvas.add(obj)
      canvas.setActiveObject(obj)
      canvas.requestRenderAll()
    }
    useEditorUiStore.getState().select(element.id)
  }, [])

  const selectElement = useCallback((id: string | null) => {
    const canvas = fabricCanvasRef.current
    if (canvas) {
      if (id) {
        const obj = findObjectByElementId(canvas.getObjects(), id)
        if (obj) canvas.setActiveObject(obj)
      } else {
        canvas.discardActiveObject()
      }
      canvas.requestRenderAll()
    }
    useEditorUiStore.getState().select(id)
  }, [])

  const deleteElement = useCallback((id: string) => {
    const canvas = fabricCanvasRef.current
    if (canvas) {
      const obj = findObjectByElementId(canvas.getObjects(), id)
      if (obj) canvas.remove(obj)
      canvas.requestRenderAll()
    }
    useProjectStore.getState().removeElement(id)
    if (useEditorUiStore.getState().selectedElementId === id) useEditorUiStore.getState().select(null)
  }, [])

  const duplicateElement = useCallback((id: string) => {
    const newId = useProjectStore.getState().duplicateElement(id)
    if (!newId) return
    const newElement = getActiveTemplate().elements.find((el) => el.id === newId)
    const canvas = fabricCanvasRef.current
    if (canvas && newElement) {
      const obj = buildFabricObject(newElement)
      canvas.add(obj)
      canvas.setActiveObject(obj)
      canvas.requestRenderAll()
    }
    useEditorUiStore.getState().select(newId)
  }, [])

  const updateSelectedProperties = useCallback(
    (patch: ElementPatch) => {
      const id = useEditorUiStore.getState().selectedElementId
      if (!id) return
      useProjectStore.getState().updateElement(id, patch)
      const canvas = fabricCanvasRef.current
      const obj = canvas ? findObjectByElementId(canvas.getObjects(), id) : undefined
      if (canvas && obj) {
        applyPatchToFabricObject(obj, patch)
        canvas.requestRenderAll()
      }
      // Covers bindingKey/formatAs changes (and static text edits on an element that's since been
      // unbound) — applyPatchToFabricObject above already set patch.text verbatim when present,
      // this reconciles it against the current binding/preview-row state.
      applyPreviewData()
    },
    [applyPreviewData]
  )

  const reorderElement = useCallback(
    (id: string, direction: 'up' | 'down' | 'front' | 'back') => {
      useProjectStore.getState().reorderElement(id, direction)
      rehydrate()
    },
    [rehydrate]
  )

  const undo = useCallback(() => {
    useProjectStore.getState().undo()
    rehydrate()
  }, [rehydrate])

  const redo = useCallback(() => {
    useProjectStore.getState().redo()
    rehydrate()
  }, [rehydrate])

  const setCardSizeMm = useCallback((widthMm: number, heightMm: number) => {
    useProjectStore.getState().setCardSize(widthMm, heightMm)
    const sizePx = { width: mmToPx(widthMm), height: mmToPx(heightMm) }
    setCanvasSizePx(sizePx)
    fabricCanvasRef.current?.setDimensions(sizePx)
    fabricCanvasRef.current?.requestRenderAll()
  }, [])

  const switchTemplate = useCallback(
    (templateId: string) => {
      useProjectStore.getState().setActiveTemplate(templateId)
      rehydrate()
    },
    [rehydrate]
  )

  const addTemplate = useCallback(() => {
    useProjectStore.getState().addTemplate()
    rehydrate()
  }, [rehydrate])

  const duplicateTemplate = useCallback(
    (id: string) => {
      useProjectStore.getState().duplicateTemplate(id)
      rehydrate()
    },
    [rehydrate]
  )

  const deleteTemplate = useCallback(
    (id: string) => {
      useProjectStore.getState().deleteTemplate(id)
      rehydrate()
    },
    [rehydrate]
  )

  // Patches a text element's bindingKey directly in the store — used by the centralized field-mappings
  // panel, which edits bindings across potentially non-active templates. Only touches the live canvas
  // (and re-applies preview data) when the edited template happens to be the active one.
  const setElementBinding = useCallback(
    (templateId: string, elementId: string, bindingKey: string | undefined) => {
      useProjectStore.getState().updateElementInTemplate(templateId, elementId, { bindingKey })
      if (templateId === useProjectStore.getState().activeTemplateId) {
        rehydrate()
      }
    },
    [rehydrate]
  )

  // Captured once: the mount effect below must only read the size at mount time. Later resizes go
  // through setCardSizeMm's imperative canvas.setDimensions() call, not through recreating the canvas.
  const initialSizePxRef = useRef(canvasSizePx)

  // useLayoutEffect (not useEffect): the canvas element has no width/height attributes of its own
  // (Fabric owns those, see CanvasEditor.tsx) — sizing it here needs to happen before the browser
  // paints, or the default 300x150 canvas would flash for a frame.
  useLayoutEffect(() => {
    const el = canvasElRef.current
    if (!el) return

    const canvas = new Canvas(el, {
      width: initialSizePxRef.current.width,
      height: initialSizePxRef.current.height,
      selection: false,
      preserveObjectStacking: true,
      defaultCursor: 'grab'
    })
    fabricCanvasRef.current = canvas
    rehydrate()

    canvas.on('selection:created', (e) => {
      const obj = e.selected[0] as TaggedFabricObject | undefined
      useEditorUiStore.getState().select(obj?.elementId ?? null)
    })
    canvas.on('selection:updated', (e) => {
      const obj = e.selected[0] as TaggedFabricObject | undefined
      useEditorUiStore.getState().select(obj?.elementId ?? null)
    })
    canvas.on('selection:cleared', () => {
      useEditorUiStore.getState().select(null)
    })

    canvas.on('object:modified', (e) => {
      const obj = e.target as TaggedFabricObject
      if (!obj.elementId) return
      const patch = readGeometryPatch(obj)
      useProjectStore.getState().updateElement(obj.elementId, patch)
      setGuides([])
    })

    canvas.on('object:moving', (e) => {
      const target = e.target as TaggedFabricObject
      const others = canvas
        .getObjects()
        .filter((o) => o !== target)
        .map((o) => ({
          left: o.left ?? 0,
          top: o.top ?? 0,
          width: (o.width ?? 0) * (o.scaleX ?? 1),
          height: (o.height ?? 0) * (o.scaleY ?? 1)
        }))
      const movingBox = {
        left: target.left ?? 0,
        top: target.top ?? 0,
        width: (target.width ?? 0) * (target.scaleX ?? 1),
        height: (target.height ?? 0) * (target.scaleY ?? 1)
      }
      const { dx, dy, guides: nextGuides } = computeSnapAdjustment(
        movingBox,
        canvasSizePx.width,
        canvasSizePx.height,
        others
      )
      if (dx !== 0 || dy !== 0) {
        target.set({ left: (target.left ?? 0) + dx, top: (target.top ?? 0) + dy })
      }
      setGuides(nextGuides)
    })

    canvas.on('mouse:up', () => setGuides([]))

    // Drag-to-pan: left-drag on empty canvas space, or middle-drag anywhere (even over an object) —
    // scoped to these two cases specifically so it never competes with Fabric's own click-to-select
    // or drag-to-move-an-object interactions, which only ever start on a left-click that hits a target.
    let panOrigin: { x: number; y: number; scrollLeft: number; scrollTop: number } | null = null

    const handlePanMove = (event: MouseEvent): void => {
      const viewport = viewportElRef.current
      if (!panOrigin || !viewport) return
      viewport.scrollLeft = panOrigin.scrollLeft - (event.clientX - panOrigin.x)
      viewport.scrollTop = panOrigin.scrollTop - (event.clientY - panOrigin.y)
    }
    const handlePanEnd = (): void => {
      panOrigin = null
      window.removeEventListener('mousemove', handlePanMove)
      window.removeEventListener('mouseup', handlePanEnd)
      canvas.defaultCursor = 'grab'
      canvas.setCursor('grab')
    }
    canvas.on('mouse:down', (opt) => {
      const event = opt.e as MouseEvent
      const isPannableClick = event.button === 1 || (event.button === 0 && !opt.target)
      const viewport = viewportElRef.current
      if (!isPannableClick || !viewport) return
      event.preventDefault()
      panOrigin = { x: event.clientX, y: event.clientY, scrollLeft: viewport.scrollLeft, scrollTop: viewport.scrollTop }
      canvas.defaultCursor = 'grabbing'
      canvas.setCursor('grabbing')
      window.addEventListener('mousemove', handlePanMove)
      window.addEventListener('mouseup', handlePanEnd)
    })

    canvas.on('text:editing:exited', (e) => {
      const obj = e.target as unknown as TaggedFabricObject
      if (!obj.elementId) return
      const patch = readTextPatch(obj)
      if (Object.keys(patch).length > 0) useProjectStore.getState().updateElement(obj.elementId, patch)
      const element = getActiveTemplate().elements.find((el) => el.id === obj.elementId)
      if (element?.type === 'text' && obj instanceof Textbox) {
        fitTextToWidth(obj, element, editorUnits, useProjectStore.getState().cardHeightMm)
      }
    })

    const handleKeyDown = (event: KeyboardEvent): void => {
      const activeEl = document.activeElement
      const isTypingInInput = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement
      const activeObject = canvas.getActiveObject() as (TaggedFabricObject & { isEditing?: boolean }) | undefined
      if (isTypingInInput || activeObject?.isEditing) return

      const ctrlOrCmd = event.ctrlKey || event.metaKey
      if ((event.key === 'Delete' || event.key === 'Backspace') && activeObject) {
        event.preventDefault()
        deleteElement(activeObject.elementId)
      } else if (ctrlOrCmd && event.key.toLowerCase() === 'd' && activeObject) {
        event.preventDefault()
        duplicateElement(activeObject.elementId)
      } else if (ctrlOrCmd && event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        redo()
      } else if (ctrlOrCmd && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
      } else if (ctrlOrCmd && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousemove', handlePanMove)
      window.removeEventListener('mouseup', handlePanEnd)
      void canvas.dispose()
      fabricCanvasRef.current = null
    }
    // Every dependency below is referentially stable for the component's lifetime (the callbacks read
    // fresh state via getState() rather than closing over props; initial size comes from a ref, not
    // canvasSizePx, specifically so later resizes don't recreate the canvas) — this runs once on mount.
  }, [rehydrate, deleteElement, duplicateElement, undo, redo])

  // Reacts to preview-product changes and to edits on the product catalog itself (e.g. changing the
  // previewed product's Naam updates the live canvas immediately) — without needing store reads
  // inside the render path above.
  useEffect(() => {
    const unsubProducts = useProductStore.subscribe((state, prevState) => {
      if (state.products !== prevState.products) applyPreviewData()
    })
    const unsubPreview = useEditorUiStore.subscribe((state, prevState) => {
      if (state.previewProductId !== prevState.previewProductId) applyPreviewData()
    })
    return () => {
      unsubProducts()
      unsubPreview()
    }
  }, [applyPreviewData])

  // Images can finish decoding asynchronously after mount (boot-time load, or an import while the
  // canvas is already showing). Any element referencing a newly-resolved assetId is still rendering
  // its dashed placeholder until the whole template is rebuilt from the store.
  useEffect(() => {
    return useAssetStore.subscribe((state, prevState) => {
      if (state.imageAssets !== prevState.imageAssets) rehydrate()
    })
  }, [rehydrate])

  return {
    canvasElRef,
    viewportElRef,
    guides,
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
  }
}
