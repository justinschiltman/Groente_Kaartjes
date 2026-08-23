import { create } from 'zustand'
import type { MultiValueField, MultiValueFieldKey, Product, ProductImportRow } from '@shared/types/product'
import { createDefaultProduct, createMultiValueField } from '@shared/types/product'

const STORAGE_KEY = 'groente-kaartjes:products'

interface PersistedProducts {
  products: Product[]
}

function loadPersisted(): PersistedProducts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.products)) return { products: parsed.products }
    }
  } catch {
    // Corrupted or unreadable persisted state falls back to an empty catalog rather than crashing.
  }
  return { products: [] }
}

function persist(data: PersistedProducts): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Best-effort only (e.g. storage quota/private browsing) — should never block editing.
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/** Adds (de-duplicated) value to a multi-value field and makes it the favorite — used by both the
 * manual per-option "add" action and bulk-import upserts, which should never destroy other saved
 * alternates, only add-and-favorite the newly given value. */
function withFavorited(field: MultiValueField, value: string): MultiValueField {
  const trimmed = value.trim()
  if (!trimmed) return field
  const existing = field.options.find((o) => normalize(o) === normalize(trimmed))
  const options = existing ? field.options : [...field.options, trimmed]
  return { options, favorite: existing ?? trimmed }
}

interface ProductState {
  products: Product[]

  addProduct: () => string
  updateProduct: (
    id: string,
    patch: Partial<
      Pick<Product, 'name' | 'orderNumber' | 'scaleCode' | 'quantity' | 'isPromotion' | 'soldByWeight' | 'pricePerKg' | 'weightGrams'>
    >
  ) => void
  deleteProduct: (id: string) => void

  addOption: (id: string, field: MultiValueFieldKey, value: string) => void
  removeOption: (id: string, field: MultiValueFieldKey, value: string) => void
  setFavorite: (id: string, field: MultiValueFieldKey, value: string) => void

  /** Bulk-import upsert: matches by orderNumber (case/whitespace-insensitive), creating a new product
   * if none matches. Only ever adds+favorites the given text values, never removes existing alternates.
   * Every row unconditionally sets quantity to 1 — importing a sheet means "order one card for
   * everything in it" by default; price/actie/eenheid are overwritten when the sheet provides them. */
  upsertByOrderNumber: (data: ProductImportRow) => 'created' | 'updated'

  /** After a successful "Verwerken": clears quantity/isPromotion/soldByWeight/pricePerKg on exactly
   * the given products (the ones actually rendered) so last week's batch is never reprinted by
   * accident, while any skipped (incomplete) products keep their in-progress values untouched. */
  resetProcessed: (ids: string[]) => void
}

export const useProductStore = create<ProductState>((set, get) => {
  function persistCurrent(): void {
    persist({ products: get().products })
  }

  function updateOne(id: string, mutate: (p: Product) => Product): void {
    set({ products: get().products.map((p) => (p.id === id ? mutate(p) : p)) })
    persistCurrent()
  }

  const initial = loadPersisted()

  return {
    products: initial.products,

    addProduct: () => {
      const fresh = createDefaultProduct()
      set({ products: [...get().products, fresh] })
      persistCurrent()
      return fresh.id
    },

    updateProduct: (id, patch) => updateOne(id, (p) => ({ ...p, ...patch, updatedAt: new Date().toISOString() })),

    deleteProduct: (id) => {
      set({ products: get().products.filter((p) => p.id !== id) })
      persistCurrent()
    },

    addOption: (id, field, value) =>
      updateOne(id, (p) => ({ ...p, [field]: withFavorited(p[field], value), updatedAt: new Date().toISOString() })),

    removeOption: (id, field, value) =>
      updateOne(id, (p) => {
        const current = p[field]
        const options = current.options.filter((o) => o !== value)
        const favorite = current.favorite === value ? (options[0] ?? '') : current.favorite
        return { ...p, [field]: { options, favorite }, updatedAt: new Date().toISOString() }
      }),

    setFavorite: (id, field, value) =>
      updateOne(id, (p) => {
        const current = p[field]
        if (!current.options.includes(value)) return p
        return { ...p, [field]: { ...current, favorite: value }, updatedAt: new Date().toISOString() }
      }),

    upsertByOrderNumber: (data) => {
      const existing = get().products.find((p) => normalize(p.orderNumber) === normalize(data.orderNumber))
      const now = new Date().toISOString()

      if (existing) {
        updateOne(existing.id, (p) => ({
          ...p,
          name: data.name?.trim() || p.name,
          scaleCode: data.scaleCode?.trim() || p.scaleCode,
          text1: data.text1 ? withFavorited(p.text1, data.text1) : p.text1,
          text2: data.text2 ? withFavorited(p.text2, data.text2) : p.text2,
          countryOfOrigin: data.countryOfOrigin ? withFavorited(p.countryOfOrigin, data.countryOfOrigin) : p.countryOfOrigin,
          soldPer: data.soldPer ? withFavorited(p.soldPer, data.soldPer) : p.soldPer,
          quantity: 1,
          isPromotion: data.isPromotion ?? p.isPromotion,
          soldByWeight: data.soldByWeight ?? p.soldByWeight,
          pricePerKg: data.pricePerKg ?? p.pricePerKg,
          weightGrams: data.weightGrams ?? p.weightGrams,
          updatedAt: now
        }))
        return 'updated'
      }

      const fresh: Product = {
        id: crypto.randomUUID(),
        name: data.name?.trim() ?? '',
        orderNumber: data.orderNumber.trim(),
        scaleCode: data.scaleCode?.trim() ?? '',
        text1: createMultiValueField(data.text1),
        text2: createMultiValueField(data.text2),
        countryOfOrigin: createMultiValueField(data.countryOfOrigin),
        soldPer: createMultiValueField(data.soldPer),
        quantity: 1,
        isPromotion: data.isPromotion ?? false,
        soldByWeight: data.soldByWeight ?? false,
        pricePerKg: data.pricePerKg ?? null,
        weightGrams: data.weightGrams ?? null,
        createdAt: now,
        updatedAt: now
      }
      set({ products: [...get().products, fresh] })
      persistCurrent()
      return 'created'
    },

    resetProcessed: (ids) => {
      const idSet = new Set(ids)
      const now = new Date().toISOString()
      set({
        products: get().products.map((p) =>
          idSet.has(p.id)
            ? { ...p, quantity: 0, isPromotion: false, soldByWeight: false, pricePerKg: null, weightGrams: null, updatedAt: now }
            : p
        )
      })
      persistCurrent()
    }
  }
})
