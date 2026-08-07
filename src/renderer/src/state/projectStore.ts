import { create } from 'zustand'
import type { CardElement, ElementPatch, LayoutGuides, Template } from '@shared/types/template'
import { createDefaultTemplate } from '@shared/types/template'

const UNDO_LIMIT = 50

// Temporary until Phase 2 replaces this with file-backed project persistence via the main process.
const STORAGE_KEY = 'groente-kaartjes:template'

function loadPersistedTemplate(): Template {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Template
  } catch {
    // Corrupted or unreadable persisted state falls back to a fresh template rather than crashing.
  }
  return createDefaultTemplate()
}

function persist(template: Template): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(template))
  } catch {
    // Best-effort only (e.g. storage quota/private browsing) — should never block editing.
  }
}

function cloneElements(elements: CardElement[]): CardElement[] {
  return elements.map((el) => ({ ...el }))
}

interface ProjectState {
  template: Template
  undoStack: CardElement[][]
  redoStack: CardElement[][]
  addElement: (element: CardElement) => void
  updateElement: (id: string, patch: ElementPatch) => void
  removeElement: (id: string) => void
  duplicateElement: (id: string) => string | undefined
  reorderElement: (id: string, direction: 'up' | 'down' | 'front' | 'back') => void
  setCardSize: (widthMm: number, heightMm: number) => void
  setGuides: (guides: LayoutGuides | undefined) => void
  undo: () => void
  redo: () => void
}

export const useProjectStore = create<ProjectState>((set, get) => {
  function commit(mutate: (elements: CardElement[]) => CardElement[]): void {
    const { template, undoStack } = get()
    const nextUndoStack = [...undoStack, cloneElements(template.elements)].slice(-UNDO_LIMIT)
    const nextElements = mutate(cloneElements(template.elements))
    const nextTemplate: Template = { ...template, elements: nextElements, updatedAt: new Date().toISOString() }
    set({ template: nextTemplate, undoStack: nextUndoStack, redoStack: [] })
    persist(nextTemplate)
  }

  return {
    template: loadPersistedTemplate(),
    undoStack: [],
    redoStack: [],

    addElement: (element) => commit((elements) => [...elements, element]),

    updateElement: (id, patch) =>
      commit((elements) => elements.map((el) => (el.id === id ? ({ ...el, ...patch } as CardElement) : el))),

    removeElement: (id) => commit((elements) => elements.filter((el) => el.id !== id)),

    duplicateElement: (id) => {
      const { template } = get()
      const source = template.elements.find((el) => el.id === id)
      if (!source) return undefined
      const newId = crypto.randomUUID()
      const maxZ = template.elements.reduce((max, el) => Math.max(max, el.zIndex), 0)
      const clone: CardElement = { ...source, id: newId, x: source.x + 4, y: source.y + 4, zIndex: maxZ + 1 }
      commit((elements) => [...elements, clone])
      return newId
    },

    reorderElement: (id, direction) =>
      commit((elements) => {
        const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)
        const index = sorted.findIndex((el) => el.id === id)
        if (index === -1) return elements

        if (direction === 'up' || direction === 'down') {
          const swapWith = direction === 'up' ? index + 1 : index - 1
          if (swapWith < 0 || swapWith >= sorted.length) return elements
          const zHere = sorted[index].zIndex
          sorted[index].zIndex = sorted[swapWith].zIndex
          sorted[swapWith].zIndex = zHere
          return sorted
        }

        // front/back: move the element to the extreme and renormalize everyone to a dense 0..N-1 order.
        const [moved] = sorted.splice(index, 1)
        if (direction === 'front') sorted.push(moved)
        else sorted.unshift(moved)
        sorted.forEach((el, i) => {
          el.zIndex = i
        })
        return sorted
      }),

    setCardSize: (widthMm, heightMm) => {
      const { template } = get()
      const nextTemplate: Template = {
        ...template,
        cardWidthMm: widthMm,
        cardHeightMm: heightMm,
        updatedAt: new Date().toISOString()
      }
      set({ template: nextTemplate })
      persist(nextTemplate)
    },

    setGuides: (guides) => {
      const { template } = get()
      const nextTemplate: Template = { ...template, guides, updatedAt: new Date().toISOString() }
      set({ template: nextTemplate })
      persist(nextTemplate)
    },

    undo: () => {
      const { template, undoStack, redoStack } = get()
      const previous = undoStack[undoStack.length - 1]
      if (!previous) return
      const nextTemplate: Template = { ...template, elements: previous, updatedAt: new Date().toISOString() }
      set({
        template: nextTemplate,
        undoStack: undoStack.slice(0, -1),
        redoStack: [...redoStack, cloneElements(template.elements)]
      })
      persist(nextTemplate)
    },

    redo: () => {
      const { template, undoStack, redoStack } = get()
      const next = redoStack[redoStack.length - 1]
      if (!next) return
      const nextTemplate: Template = { ...template, elements: next, updatedAt: new Date().toISOString() }
      set({
        template: nextTemplate,
        undoStack: [...undoStack, cloneElements(template.elements)],
        redoStack: redoStack.slice(0, -1)
      })
      persist(nextTemplate)
    }
  }
})
