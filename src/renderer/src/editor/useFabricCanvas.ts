import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from 'fabric'
import { useProjectStore } from '@renderer/state/projectStore'
import { useEditorUiStore } from '@renderer/state/editorUiStore'
import type { ElementPatch, ShapeKind } from '@shared/types/template'
import { createShapeElement, createTextElement } from './elementFactory'
import {
  applyPatchToFabricObject,
  buildFabricObject,
  findObjectByElementId,
  readGeometryPatch,
  readTextPatch,
  type TaggedFabricObject
} from './fabricSync'
import { computeSnapAdjustment, type SnapGuide } from './snapping'
import { mmToPx } from './units'

export interface UseFabricCanvasResult {
  canvasElRef: React.RefObject<HTMLCanvasElement | null>
  guides: SnapGuide[]
  canvasSizePx: { width: number; height: number }
  addText: () => void
  addShape: (shape: ShapeKind) => void
  deleteElement: (id: string) => void
  duplicateElement: (id: string) => void
  updateSelectedProperties: (patch: ElementPatch) => void
  reorderElement: (id: string, direction: 'up' | 'down') => void
  selectElement: (id: string | null) => void
  undo: () => void
  redo: () => void
}

export function useFabricCanvas(): UseFabricCanvasResult {
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<Canvas | null>(null)
  const [guides, setGuides] = useState<SnapGuide[]>([])
  const [canvasSizePx] = useState(() => {
    const template = useProjectStore.getState().template
    return { width: mmToPx(template.cardWidthMm), height: mmToPx(template.cardHeightMm) }
  })

  // Rebuilds every fabric object from the store. Used for mount/undo/redo/reorder — never wired
  // to a generic store subscription, so canvas-originated commits don't trigger a redundant rebuild.
  const rehydrate = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    // Captured before clear() — clear() synchronously fires 'selection:cleared', which would
    // otherwise reset the store's selection before we get a chance to read and restore it.
    const selectedId = useEditorUiStore.getState().selectedElementId
    const { template } = useProjectStore.getState()
    canvas.clear()
    canvas.backgroundColor = template.backgroundColor
    const sorted = [...template.elements].sort((a, b) => a.zIndex - b.zIndex)
    sorted.forEach((element) => canvas.add(buildFabricObject(element)))

    const selectedObj = selectedId ? findObjectByElementId(canvas.getObjects(), selectedId) : undefined
    if (selectedObj) canvas.setActiveObject(selectedObj)
    useEditorUiStore.getState().select(selectedObj ? selectedId : null)

    canvas.requestRenderAll()
  }, [])

  const addText = useCallback(() => {
    const { template, addElement } = useProjectStore.getState()
    const element = createTextElement(template.elements, template.cardWidthMm, template.cardHeightMm)
    addElement(element)
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
    const { template, addElement } = useProjectStore.getState()
    const element = createShapeElement(template.elements, template.cardWidthMm, template.cardHeightMm, shape)
    addElement(element)
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
    const newElement = useProjectStore.getState().template.elements.find((el) => el.id === newId)
    const canvas = fabricCanvasRef.current
    if (canvas && newElement) {
      const obj = buildFabricObject(newElement)
      canvas.add(obj)
      canvas.setActiveObject(obj)
      canvas.requestRenderAll()
    }
    useEditorUiStore.getState().select(newId)
  }, [])

  const updateSelectedProperties = useCallback((patch: ElementPatch) => {
    const id = useEditorUiStore.getState().selectedElementId
    if (!id) return
    useProjectStore.getState().updateElement(id, patch)
    const canvas = fabricCanvasRef.current
    const obj = canvas ? findObjectByElementId(canvas.getObjects(), id) : undefined
    if (canvas && obj) {
      applyPatchToFabricObject(obj, patch)
      canvas.requestRenderAll()
    }
  }, [])

  const reorderElement = useCallback(
    (id: string, direction: 'up' | 'down') => {
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

  useEffect(() => {
    const el = canvasElRef.current
    if (!el) return

    const canvas = new Canvas(el, {
      width: canvasSizePx.width,
      height: canvasSizePx.height,
      selection: false,
      preserveObjectStacking: true
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

    canvas.on('text:editing:exited', (e) => {
      const obj = e.target as unknown as TaggedFabricObject
      if (!obj.elementId) return
      const patch = readTextPatch(obj)
      if (Object.keys(patch).length > 0) useProjectStore.getState().updateElement(obj.elementId, patch)
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
      void canvas.dispose()
      fabricCanvasRef.current = null
    }
    // Every dependency below is referentially stable for the component's lifetime (canvasSizePx is
    // set once via useState; the callbacks read fresh state via getState() rather than closing over
    // props), so in practice this effect only runs on mount and cleans up on unmount.
  }, [canvasSizePx.width, canvasSizePx.height, rehydrate, deleteElement, duplicateElement, undo, redo])

  return {
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
  }
}
