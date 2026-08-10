import { create } from 'zustand'
import { DEFAULT_CARD_HEIGHT_MM, DEFAULT_CARD_WIDTH_MM } from '@shared/constants'
import type { CardElement, ElementPatch, LayoutGuides, Template } from '@shared/types/template'
import { createDefaultTemplate } from '@shared/types/template'

const UNDO_LIMIT = 50

// Temporary until Phase 6 replaces this with real file-backed project persistence via the main process.
const STORAGE_KEY = 'groente-kaartjes:template'

interface PersistedProject {
  templates: Template[]
  activeTemplateId: string
  triggerField: string | null
  defaultTemplateId: string | null
  cardWidthMm: number
  cardHeightMm: number
}

function loadPersistedProject(): PersistedProject {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.templates) && parsed.templates.length > 0) {
        // Migrate from the earlier multi-template shape where card size still lived per-template.
        const firstWithSize = parsed.templates.find(
          (t: Template & { cardWidthMm?: number; cardHeightMm?: number }) => t.cardWidthMm && t.cardHeightMm
        )
        const cardWidthMm = parsed.cardWidthMm ?? firstWithSize?.cardWidthMm ?? DEFAULT_CARD_WIDTH_MM
        const cardHeightMm = parsed.cardHeightMm ?? firstWithSize?.cardHeightMm ?? DEFAULT_CARD_HEIGHT_MM
        const templates = (parsed.templates as Template[]).map((t) => {
          const clean = { ...t } as Template & { cardWidthMm?: number; cardHeightMm?: number }
          delete clean.cardWidthMm
          delete clean.cardHeightMm
          return clean
        })
        return {
          templates,
          activeTemplateId: parsed.activeTemplateId,
          triggerField: parsed.triggerField ?? null,
          defaultTemplateId: parsed.defaultTemplateId ?? null,
          cardWidthMm,
          cardHeightMm
        }
      }
      // Migrate the original pre-multi-template shape (a single Template stored directly).
      if (parsed && typeof parsed.id === 'string' && Array.isArray(parsed.elements)) {
        const legacy = parsed as Template & { cardWidthMm?: number; cardHeightMm?: number }
        const clean = { ...legacy } as Template & { cardWidthMm?: number; cardHeightMm?: number }
        delete clean.cardWidthMm
        delete clean.cardHeightMm
        return {
          templates: [clean],
          activeTemplateId: legacy.id,
          triggerField: null,
          defaultTemplateId: legacy.id,
          cardWidthMm: legacy.cardWidthMm ?? DEFAULT_CARD_WIDTH_MM,
          cardHeightMm: legacy.cardHeightMm ?? DEFAULT_CARD_HEIGHT_MM
        }
      }
    }
  } catch {
    // Corrupted or unreadable persisted state falls back to a fresh project rather than crashing.
  }
  const fresh = createDefaultTemplate()
  return {
    templates: [fresh],
    activeTemplateId: fresh.id,
    triggerField: null,
    defaultTemplateId: fresh.id,
    cardWidthMm: DEFAULT_CARD_WIDTH_MM,
    cardHeightMm: DEFAULT_CARD_HEIGHT_MM
  }
}

function persist(data: PersistedProject): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Best-effort only (e.g. storage quota/private browsing) — should never block editing.
  }
}

function cloneElements(elements: CardElement[]): CardElement[] {
  return elements.map((el) => ({ ...el }))
}

interface ProjectState {
  templates: Template[]
  activeTemplateId: string
  triggerField: string | null
  defaultTemplateId: string | null
  cardWidthMm: number
  cardHeightMm: number
  undoStack: CardElement[][]
  redoStack: CardElement[][]

  addElement: (element: CardElement) => void
  updateElement: (id: string, patch: ElementPatch) => void
  updateElementInTemplate: (templateId: string, elementId: string, patch: ElementPatch) => void
  removeElement: (id: string) => void
  duplicateElement: (id: string) => string | undefined
  reorderElement: (id: string, direction: 'up' | 'down' | 'front' | 'back') => void
  setCardSize: (widthMm: number, heightMm: number) => void
  setGuides: (guides: LayoutGuides | undefined) => void

  addTemplate: () => string
  duplicateTemplate: (id: string) => string | undefined
  renameTemplate: (id: string, name: string) => void
  deleteTemplate: (id: string) => void
  setActiveTemplate: (id: string) => void
  setTemplateTriggerValues: (id: string, values: string[]) => void
  setTriggerField: (field: string | null) => void
  setDefaultTemplateId: (id: string | null) => void

  undo: () => void
  redo: () => void
}

export const useProjectStore = create<ProjectState>((set, get) => {
  function persistCurrent(): void {
    const { templates, activeTemplateId, triggerField, defaultTemplateId, cardWidthMm, cardHeightMm } = get()
    persist({ templates, activeTemplateId, triggerField, defaultTemplateId, cardWidthMm, cardHeightMm })
  }

  function activeTemplate(): Template | undefined {
    const { templates, activeTemplateId } = get()
    return templates.find((t) => t.id === activeTemplateId)
  }

  function updateActiveTemplate(mutate: (template: Template) => Template): void {
    const { templates, activeTemplateId } = get()
    const nextTemplates = templates.map((t) => (t.id === activeTemplateId ? mutate(t) : t))
    set({ templates: nextTemplates })
    persistCurrent()
  }

  function commit(mutate: (elements: CardElement[]) => CardElement[]): void {
    const current = activeTemplate()
    if (!current) return
    const { undoStack } = get()
    const nextUndoStack = [...undoStack, cloneElements(current.elements)].slice(-UNDO_LIMIT)
    const nextElements = mutate(cloneElements(current.elements))
    updateActiveTemplate((t) => ({ ...t, elements: nextElements, updatedAt: new Date().toISOString() }))
    set({ undoStack: nextUndoStack, redoStack: [] })
  }

  const initial = loadPersistedProject()

  return {
    templates: initial.templates,
    activeTemplateId: initial.activeTemplateId,
    triggerField: initial.triggerField,
    defaultTemplateId: initial.defaultTemplateId,
    cardWidthMm: initial.cardWidthMm,
    cardHeightMm: initial.cardHeightMm,
    undoStack: [],
    redoStack: [],

    addElement: (element) => commit((elements) => [...elements, element]),

    updateElement: (id, patch) =>
      commit((elements) => elements.map((el) => (el.id === id ? ({ ...el, ...patch } as CardElement) : el))),

    // Unlike updateElement (which always targets the active template via commit/undo-stack), this can
    // patch an element in ANY template — needed by the centralized field-mappings panel, which edits
    // bindings across the whole project at once. Deliberately bypasses undo (a settings-panel action,
    // not a canvas edit) and does not touch the live Fabric canvas itself (the caller re-syncs if needed).
    updateElementInTemplate: (templateId, elementId, patch) => {
      const { templates } = get()
      const nextTemplates = templates.map((t) => {
        if (t.id !== templateId) return t
        return {
          ...t,
          elements: t.elements.map((el) => (el.id === elementId ? ({ ...el, ...patch } as CardElement) : el)),
          updatedAt: new Date().toISOString()
        }
      })
      set({ templates: nextTemplates })
      persistCurrent()
    },

    removeElement: (id) => commit((elements) => elements.filter((el) => el.id !== id)),

    duplicateElement: (id) => {
      const current = activeTemplate()
      const source = current?.elements.find((el) => el.id === id)
      if (!current || !source) return undefined
      const newId = crypto.randomUUID()
      const maxZ = current.elements.reduce((max, el) => Math.max(max, el.zIndex), 0)
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

        const [moved] = sorted.splice(index, 1)
        if (direction === 'front') sorted.push(moved)
        else sorted.unshift(moved)
        sorted.forEach((el, i) => {
          el.zIndex = i
        })
        return sorted
      }),

    // Project-wide, not per-template: every design must share one size so the batch export can
    // stack any of them into any of a page's card slots.
    setCardSize: (widthMm, heightMm) => {
      set({ cardWidthMm: widthMm, cardHeightMm: heightMm })
      persistCurrent()
    },

    setGuides: (guides) => {
      updateActiveTemplate((t) => ({ ...t, guides, updatedAt: new Date().toISOString() }))
    },

    addTemplate: () => {
      const { templates } = get()
      const fresh = createDefaultTemplate()
      fresh.name = `Ontwerp ${templates.length + 1}`
      set({ templates: [...templates, fresh], activeTemplateId: fresh.id, undoStack: [], redoStack: [] })
      persistCurrent()
      return fresh.id
    },

    duplicateTemplate: (id) => {
      const { templates } = get()
      const source = templates.find((t) => t.id === id)
      if (!source) return undefined
      const now = new Date().toISOString()
      const clone: Template = {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name} (kopie)`,
        elements: cloneElements(source.elements),
        triggerValues: undefined,
        createdAt: now,
        updatedAt: now
      }
      set({ templates: [...templates, clone], activeTemplateId: clone.id, undoStack: [], redoStack: [] })
      persistCurrent()
      return clone.id
    },

    renameTemplate: (id, name) => {
      const { templates } = get()
      set({ templates: templates.map((t) => (t.id === id ? { ...t, name, updatedAt: new Date().toISOString() } : t)) })
      persistCurrent()
    },

    deleteTemplate: (id) => {
      const { templates, activeTemplateId, defaultTemplateId } = get()
      if (templates.length <= 1) return
      const nextTemplates = templates.filter((t) => t.id !== id)
      const nextActiveId = activeTemplateId === id ? nextTemplates[0].id : activeTemplateId
      const nextDefaultId = defaultTemplateId === id ? null : defaultTemplateId
      set({
        templates: nextTemplates,
        activeTemplateId: nextActiveId,
        defaultTemplateId: nextDefaultId,
        undoStack: [],
        redoStack: []
      })
      persistCurrent()
    },

    setActiveTemplate: (id) => {
      const { templates, activeTemplateId } = get()
      if (id === activeTemplateId || !templates.some((t) => t.id === id)) return
      set({ activeTemplateId: id, undoStack: [], redoStack: [] })
      persistCurrent()
    },

    setTemplateTriggerValues: (id, values) => {
      const { templates } = get()
      set({
        templates: templates.map((t) => (t.id === id ? { ...t, triggerValues: values, updatedAt: new Date().toISOString() } : t))
      })
      persistCurrent()
    },

    setTriggerField: (field) => {
      set({ triggerField: field })
      persistCurrent()
    },

    setDefaultTemplateId: (id) => {
      set({ defaultTemplateId: id })
      persistCurrent()
    },

    undo: () => {
      const current = activeTemplate()
      const { undoStack, redoStack } = get()
      const previous = undoStack[undoStack.length - 1]
      if (!current || !previous) return
      updateActiveTemplate((t) => ({ ...t, elements: previous, updatedAt: new Date().toISOString() }))
      set({ undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, cloneElements(current.elements)] })
    },

    redo: () => {
      const current = activeTemplate()
      const { undoStack, redoStack } = get()
      const next = redoStack[redoStack.length - 1]
      if (!current || !next) return
      updateActiveTemplate((t) => ({ ...t, elements: next, updatedAt: new Date().toISOString() }))
      set({ undoStack: [...undoStack, cloneElements(current.elements)], redoStack: redoStack.slice(0, -1) })
    }
  }
})

export function useActiveTemplate(): Template {
  return useProjectStore((state) => {
    const found = state.templates.find((t) => t.id === state.activeTemplateId)
    return found ?? state.templates[0]
  })
}

/** Non-hook equivalent of useActiveTemplate, for imperative code (event handlers, callbacks outside render). */
export function getActiveTemplate(): Template {
  const state = useProjectStore.getState()
  return state.templates.find((t) => t.id === state.activeTemplateId) ?? state.templates[0]
}
