import { create } from 'zustand'
import type { MultiValueField, MultiValueFieldKey, Product, ProductImportRow } from '@shared/types/product'
import { createDefaultProduct, createMultiValueField } from '@shared/types/product'

const STORAGE_KEY = 'groente-kaartjes:products'

/** The soldByWeight/weightGrams most recently set on ANY product (via the table, the edit modal, or
 * this same mechanism carrying forward) — used to pre-fill a freshly-added product, since most new
 * products added in one sitting tend to share the same "sold by weight, usually the same gram amount"
 * pattern, and re-checking + re-typing it every single time was pure busywork. */
interface LastUsedDefaults {
  soldByWeight: boolean
  weightGrams: number | null
}

const DEFAULT_LAST_USED: LastUsedDefaults = { soldByWeight: false, weightGrams: null }

interface PersistedProducts {
  products: Product[]
  lastUsedDefaults: LastUsedDefaults
}

function loadPersisted(): PersistedProducts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.products)) {
        // weightGrams was added after products already existed in the wild, so a record saved before
        // that has no such key at all (not even null) — normalize once on load so every reader can
        // trust `number | null` and never has to special-case `undefined`. Same story for
        // lastUsedDefaults itself, added later still.
        return {
          products: parsed.products.map((p: Product) => ({ ...p, weightGrams: p.weightGrams ?? null })),
          lastUsedDefaults: parsed.lastUsedDefaults ?? DEFAULT_LAST_USED
        }
      }
    }
  } catch {
    // Corrupted or unreadable persisted state falls back to an empty catalog rather than crashing.
  }
  return { products: [], lastUsedDefaults: DEFAULT_LAST_USED }
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

/** Same as withFavorited, but lets one imported cell seed several saved options at once by splitting
 * on ";" (e.g. "Zoet en sappig; Nu in de aanbieding") — every part is added (in the order given, after
 * any options already on the field), and the FIRST part becomes the favorite. A cell with no ";"
 * splits into a single part, so this is a strict superset of withFavorited: existing single-value
 * imports behave identically to before. */
function withFavoritedMulti(field: MultiValueField, rawText: string): MultiValueField {
  const parts = rawText
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return field
  let options = field.options
  for (const part of parts) {
    if (!options.some((o) => normalize(o) === normalize(part))) options = [...options, part]
  }
  const favorite = options.find((o) => normalize(o) === normalize(parts[0])) ?? parts[0]
  return { options, favorite }
}

function multiFieldFromImport(rawText: string | undefined): MultiValueField {
  return rawText ? withFavoritedMulti(createMultiValueField(), rawText) : createMultiValueField()
}

interface ProductState {
  products: Product[]
  lastUsedDefaults: LastUsedDefaults

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

  /** Narrow-scope import for correcting Naam/Top tekst/Tekst onder across an existing catalog without
   * the collateral risk a full upsertByOrderNumber carries: a re-exported sheet often still has the
   * Actie/Per gewicht/Prijs/Gewicht columns present but every cell blank (nothing to do with those
   * fields — the sheet just wasn't about them), and importProductsExcel reads a blank-but-present
   * boolean column as an explicit "Nee", which would silently reset promotions/eenheid across the
   * whole catalog. This only ever touches name/text1/text2 (text1/text2 fully REPLACED — not merged
   * like upsertByOrderNumber — since the point here is correcting wrong text, not accumulating
   * alternates) on a product that already exists; an orderNumber with no match is reported 'not-found'
   * rather than creating a new, mostly-empty product. */
  updateTextFieldsByOrderNumber: (data: { orderNumber: string; name?: string; text1?: string; text2?: string }) => 'updated' | 'not-found'

  /** Wipes the ENTIRE catalog first (every product, including price/actie/per-gewicht/quantity — not
   * just the ones in the given rows) and rebuilds it from scratch via upsertByOrderNumber, so this is
   * explicitly a full replace, not an incremental import. Returns the number of products created (a row
   * whose orderNumber duplicates an earlier row in the same batch updates that one instead of creating
   * a second product, so this can be fewer than rows.length). The caller is responsible for confirming
   * with the user before calling this — it's irreversible from here. */
  replaceAllFromImport: (rows: ProductImportRow[]) => number

  /** After a successful "Verwerken": clears quantity (so last week's batch is never reprinted by
   * accident) and isPromotion (a promotion is assumed to be a one-week thing) on exactly the given
   * products — the ones actually rendered. soldByWeight/pricePerKg/weightGrams are deliberately left
   * untouched: they rarely change week to week, so wiping them would just mean re-typing the same
   * values again next time. Any skipped (incomplete) product keeps all its in-progress values untouched. */
  resetProcessed: (ids: string[]) => void

  /** Sets every product's quantity to 0 in one go. Importing always puts every matched/created product
   * at "1 kaartje" by design (see upsertByOrderNumber) — right after a big catalog-building import
   * (hundreds of rows, most not meant to be printed this week) that leaves everything "ready" at once,
   * which is exactly what makes "Verwerken" warn about every product missing weekly fields it hasn't
   * gotten yet. This is the fast way back to a clean slate to then pick just what's actually wanted. */
  resetAllQuantities: () => void
}

export const useProductStore = create<ProductState>((set, get) => {
  function persistCurrent(): void {
    persist({ products: get().products, lastUsedDefaults: get().lastUsedDefaults })
  }

  function updateOne(id: string, mutate: (p: Product) => Product): void {
    set({ products: get().products.map((p) => (p.id === id ? mutate(p) : p)) })
    persistCurrent()
  }

  const initial = loadPersisted()

  return {
    products: initial.products,
    lastUsedDefaults: initial.lastUsedDefaults,

    addProduct: () => {
      const fresh = { ...createDefaultProduct(), ...get().lastUsedDefaults }
      set({ products: [...get().products, fresh] })
      persistCurrent()
      return fresh.id
    },

    updateProduct: (id, patch) => {
      const now = new Date().toISOString()
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now } : p)),
        lastUsedDefaults:
          patch.soldByWeight !== undefined || patch.weightGrams !== undefined
            ? {
                soldByWeight: patch.soldByWeight ?? state.lastUsedDefaults.soldByWeight,
                weightGrams: patch.weightGrams !== undefined ? patch.weightGrams : state.lastUsedDefaults.weightGrams
              }
            : state.lastUsedDefaults
      }))
      persistCurrent()
    },

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
          text1: data.text1 ? withFavoritedMulti(p.text1, data.text1) : p.text1,
          text2: data.text2 ? withFavoritedMulti(p.text2, data.text2) : p.text2,
          countryOfOrigin: data.countryOfOrigin ? withFavoritedMulti(p.countryOfOrigin, data.countryOfOrigin) : p.countryOfOrigin,
          soldPer: data.soldPer ? withFavoritedMulti(p.soldPer, data.soldPer) : p.soldPer,
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
        text1: multiFieldFromImport(data.text1),
        text2: multiFieldFromImport(data.text2),
        countryOfOrigin: multiFieldFromImport(data.countryOfOrigin),
        soldPer: multiFieldFromImport(data.soldPer),
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

    updateTextFieldsByOrderNumber: (data) => {
      const existing = get().products.find((p) => normalize(p.orderNumber) === normalize(data.orderNumber))
      if (!existing) return 'not-found'
      updateOne(existing.id, (p) => ({
        ...p,
        name: data.name?.trim() || p.name,
        text1: data.text1 ? multiFieldFromImport(data.text1) : p.text1,
        text2: data.text2 ? multiFieldFromImport(data.text2) : p.text2,
        updatedAt: new Date().toISOString()
      }))
      return 'updated'
    },

    replaceAllFromImport: (rows) => {
      set({ products: [] })
      persistCurrent()
      let created = 0
      for (const row of rows) {
        if (get().upsertByOrderNumber(row) === 'created') created++
      }
      return created
    },

    resetProcessed: (ids) => {
      const idSet = new Set(ids)
      const now = new Date().toISOString()
      set({
        products: get().products.map((p) =>
          idSet.has(p.id) ? { ...p, quantity: 0, isPromotion: false, updatedAt: now } : p
        )
      })
      persistCurrent()
    },

    resetAllQuantities: () => {
      const now = new Date().toISOString()
      set({
        products: get().products.map((p) => (p.quantity === 0 ? p : { ...p, quantity: 0, updatedAt: now }))
      })
      persistCurrent()
    }
  }
})
