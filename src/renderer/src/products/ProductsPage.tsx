import { useEffect, useMemo, useState } from 'react'
import { useProductStore } from '@renderer/state/productStore'
import { parseDecimalNl } from '@shared/format'
import { deriveSoldPer, effectiveSoldPer } from '@shared/mergeProductRow'
import { multiValueToExportText } from '@shared/types/product'
import type { Product, ProductExportRow } from '@shared/types/product'
import ProcessButton from '../export/ProcessButton'
import ProductEditModal from './ProductEditModal'

type SortField =
  | 'name'
  | 'quantity'
  | 'isPromotion'
  | 'soldByWeight'
  | 'weightGrams'
  | 'pricePerKg'
  | 'scaleCode'
  | 'supplierCode'
  | 'text1'
  | 'text2'
  | 'countryOfOrigin'
  | 'soldPer'

interface SortState {
  field: SortField
  direction: 'asc' | 'desc'
}

function sortValue(product: Product, field: SortField): string | number | boolean | null {
  switch (field) {
    case 'name':
      return product.name || null
    case 'quantity':
      return product.quantity
    case 'isPromotion':
      return product.isPromotion
    case 'soldByWeight':
      return product.soldByWeight
    case 'weightGrams':
      return product.weightGrams
    case 'pricePerKg':
      return product.pricePerKg
    case 'scaleCode':
      return product.scaleCode || null
    case 'supplierCode':
      return product.supplierCode || null
    case 'text1':
      return product.text1.favorite || null
    case 'text2':
      return product.text2.favorite || null
    case 'countryOfOrigin':
      return product.countryOfOrigin.favorite || null
    case 'soldPer':
      return effectiveSoldPer(product)
  }
}

/** Empty/unset values (null, "") always sort last regardless of direction — matches how spreadsheet
 * apps treat blanks, and avoids every not-yet-filled-in product jumping to the top on a descending
 * sort. Only the real value comparison flips with direction, so ties (e.g. two products both
 * unchecked on a boolean column) keep their original relative order either way, same as a
 * spreadsheet's stable sort. */
function compareSortValues(a: string | number | boolean | null, b: string | number | boolean | null, direction: 'asc' | 'desc'): number {
  const aEmpty = a === null || a === ''
  const bEmpty = b === null || b === ''
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1
  let cmp: number
  if (typeof a === 'number' && typeof b === 'number') cmp = a - b
  else if (typeof a === 'boolean' && typeof b === 'boolean') cmp = a === b ? 0 : a ? 1 : -1
  else cmp = String(a).localeCompare(String(b), 'nl', { sensitivity: 'base', numeric: true })
  return direction === 'asc' ? cmp : -cmp
}

/** Every value a search should be able to find a product by — not just what's shown in the current
 * favorite/table cell: a multi-value field's whole history (every saved Top tekst/Tekst onder/Land
 * van herkomst option, not only the current favorite) counts too, since the point of "op alles kunnen
 * zoeken" is finding a product by anything ever typed into it, not just what happens to be active. */
function searchableValues(p: Product): string[] {
  return [
    p.name,
    p.scaleCode,
    p.supplierCode,
    ...p.text1.options,
    ...p.text2.options,
    ...p.countryOfOrigin.options,
    ...p.soldPer.options
  ]
}

function productMatchesQuery(p: Product, query: string): boolean {
  return searchableValues(p).some((value) => value.toLowerCase().includes(query))
}

function toExportRow(p: Product): ProductExportRow {
  return {
    name: p.name,
    scaleCode: p.scaleCode,
    supplierCode: p.supplierCode,
    countryOfOrigin: multiValueToExportText(p.countryOfOrigin),
    text1: multiValueToExportText(p.text1),
    text2: multiValueToExportText(p.text2),
    pricePerKg: p.pricePerKg,
    isPromotion: p.isPromotion,
    soldByWeight: p.soldByWeight,
    weightGrams: p.weightGrams
  }
}

function ProductsPage(): React.JSX.Element {
  const products = useProductStore((state) => state.products)
  const addProduct = useProductStore((state) => state.addProduct)
  const updateProduct = useProductStore((state) => state.updateProduct)
  const addOption = useProductStore((state) => state.addOption)
  const removeOption = useProductStore((state) => state.removeOption)
  const upsertBySupplierCode = useProductStore((state) => state.upsertBySupplierCode)
  const updateTextFieldsBySupplierCode = useProductStore((state) => state.updateTextFieldsBySupplierCode)
  const replaceAllFromImport = useProductStore((state) => state.replaceAllFromImport)
  const resetAllQuantities = useProductStore((state) => state.resetAllQuantities)

  const [search, setSearch] = useState('')
  // Which product ids the current search matched, frozen at the moment the query was last applied —
  // null means no filter is active (show everything live). Editing a product's data (e.g. unchecking
  // Actie while filtered on Actie) must NOT make it drop out of view while you're still working on it,
  // so this only gets recomputed when the query text itself changes or the search box is focused again
  // (see applyFilter) — never merely because `products` changed underneath it.
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null)
  const [sort, setSort] = useState<SortState | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [textOnlyImport, setTextOnlyImport] = useState(false)
  const [importSummary, setImportSummary] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportSummary, setExportSummary] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  // Re-applies the search against the CURRENT product list — called on every keystroke (normal live
  // search) and whenever the search box regains focus, so clicking back into it after editing products
  // is the explicit "refresh now" action. Never runs just because `products` changed on its own.
  function applyFilter(query: string): void {
    const trimmed = query.trim().toLowerCase()
    setVisibleIds(trimmed ? products.filter((p) => productMatchesQuery(p, trimmed)).map((p) => p.id) : null)
  }

  const visibleProducts = useMemo(() => {
    const matched =
      visibleIds === null
        ? products
        : visibleIds.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => p !== undefined)
    if (!sort) return matched
    return [...matched].sort((a, b) => compareSortValues(sortValue(a, sort.field), sortValue(b, sort.field), sort.direction))
  }, [products, visibleIds, sort])

  const orderedCount = products.filter((p) => p.quantity > 0).length
  const totalCards = products.reduce((sum, p) => sum + p.quantity, 0)

  function handleAdd(): void {
    setEditingProductId(addProduct())
  }

  function handleSort(field: SortField): void {
    setSort((prev) => (prev && prev.field === field ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { field, direction: 'asc' }))
  }

  function handleResetAll(): void {
    if (orderedCount === 0) return
    if (!window.confirm(`Aantal kaartjes voor alle ${orderedCount} klaarstaande product(en) op 0 zetten?`)) return
    resetAllQuantities()
  }

  async function handleExport(): Promise<void> {
    setExporting(true)
    setExportSummary(null)
    setExportError(null)
    try {
      const result = await window.api.exportProducts(products.map(toExportRow))
      if (result.canceled) return
      if (result.error) {
        setExportError(result.error)
        return
      }
      setExportSummary(`${products.length} product(en) opgeslagen${result.filePath ? ` in ${result.filePath}` : ''}.`)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Onbekende fout bij het exporteren.')
    } finally {
      setExporting(false)
    }
  }

  // A bulk import can add/rename products that a currently-active search filter has no reason to
  // know about — since the filter is deliberately frozen against single-row edits (see visibleIds
  // above), leaving it in place after an import would silently hide exactly the new/changed products
  // the user just asked to bring in. Reset it so the full, current list is what shows up.
  function clearFilterAfterImport(): void {
    setSearch('')
    setVisibleIds(null)
  }

  async function handleImport(): Promise<void> {
    setImporting(true)
    setImportSummary(null)
    setImportError(null)
    try {
      const result = await window.api.importProducts()
      if (result.canceled) return
      if (result.error) {
        setImportError(result.error)
        return
      }
      const rows = result.rows ?? []
      const skipped = result.skippedRowCount ?? 0

      if (rows.length === 0 && skipped > 0) {
        setImportError(
          `Geen enkele rij herkend (${skipped} rij(en) overgeslagen). Controleer of de kolom "Naam" of "Bestelcode (leverancier)" bestaat — minstens een van de twee is verplicht.`
        )
        return
      }
      if (rows.length === 0) {
        setImportError('Dit Excel-bestand bevat geen productrijen om te importeren.')
        return
      }

      if (textOnlyImport) {
        let updated = 0
        let notFound = 0
        for (const row of rows) {
          const outcome = updateTextFieldsBySupplierCode(row)
          if (outcome === 'updated') updated++
          else notFound++
        }
        const notFoundNote = notFound > 0 ? `, ${notFound} bestelcode(s) niet gevonden (overgeslagen, niet aangemaakt)` : ''
        setImportSummary(`${updated} product(en) bijgewerkt (alleen Naam, Top tekst en Tekst onder)${notFoundNote}.`)
      } else {
        let created = 0
        let updated = 0
        for (const row of rows) {
          const outcome = upsertBySupplierCode(row)
          if (outcome === 'created') created++
          else updated++
        }
        const skippedNote = skipped > 0 ? `, ${skipped} rij(en) overgeslagen (geen naam en geen Bestelcode)` : ''
        setImportSummary(`${created} nieuw, ${updated} bijgewerkt (${rows.length} rijen verwerkt${skippedNote}) — allemaal op 1 kaartje gezet.`)
      }
      clearFilterAfterImport()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Onbekende fout bij het importeren.')
    } finally {
      setImporting(false)
    }
  }

  async function handleReplaceAll(): Promise<void> {
    setImporting(true)
    setImportSummary(null)
    setImportError(null)
    try {
      const result = await window.api.importProducts()
      if (result.canceled) return
      if (result.error) {
        setImportError(result.error)
        return
      }
      const rows = result.rows ?? []
      const skipped = result.skippedRowCount ?? 0
      if (rows.length === 0) {
        setImportError('Dit Excel-bestand bevat geen productrijen om te importeren.')
        return
      }
      const confirmed = window.confirm(
        `Dit verwijdert ALLE ${products.length} huidige product(en) — inclusief prijzen, Actie- en Per-gewicht-instellingen — en vervangt ze volledig door de ${rows.length} product(en) uit dit bestand. Dit kan niet ongedaan worden gemaakt. Doorgaan?`
      )
      if (!confirmed) return
      const created = replaceAllFromImport(rows)
      const skippedNote = skipped > 0 ? `, ${skipped} rij(en) overgeslagen (geen naam en geen Bestelcode)` : ''
      setImportSummary(
        `Catalogus volledig vervangen: ${created} product(en) (${rows.length} rijen verwerkt${skippedNote}) — allemaal op 1 kaartje gezet, zonder prijs en zonder Actie (die vul je zelf weer aan).`
      )
      clearFilterAfterImport()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Onbekende fout bij het vervangen.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="products-page">
      <div className="products-toolbar">
        <input
          type="text"
          className="products-search"
          placeholder="Zoeken op naam, bestelcode, weegschaalcode, teksten…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            applyFilter(e.target.value)
          }}
          onFocus={() => applyFilter(search)}
        />
        <button type="button" className={importing ? 'products-import-button importing' : 'products-import-button'} onClick={handleImport} disabled={importing}>
          {importing && <span className="spinner" aria-hidden="true" />}
          {importing ? 'Bezig met importeren…' : 'Excel importeren'}
        </button>
        <label
          className="field checkbox-field products-textonly-toggle"
          title="Werkt alleen bestaande producten bij (matcht op Bestelcode (leverancier)) en past alleen Naam, Top tekst en Tekst onder aan — Prijs, Actie, Per gewicht, Gewicht, Weegschaalcode en Land van herkomst blijven ongewijzigd. Er worden geen nieuwe producten aangemaakt; een bestelcode die nog niet bestaat wordt overgeslagen."
        >
          <input type="checkbox" checked={textOnlyImport} onChange={(e) => setTextOnlyImport(e.target.checked)} />
          <span>Alleen Naam/Top tekst/Tekst onder bijwerken</span>
        </label>
        <button
          type="button"
          className="danger"
          onClick={handleReplaceAll}
          disabled={importing}
          title="Verwijdert de hele huidige productenlijst en bouwt hem helemaal opnieuw op uit een Excel-bestand. Onomkeerbaar — vraagt om bevestiging met het aantal producten voordat er iets wordt gewist."
        >
          Catalogus wissen en vervangen
        </button>
        <button
          type="button"
          className={exporting ? 'products-import-button importing' : 'products-import-button'}
          onClick={handleExport}
          disabled={exporting || products.length === 0}
          title="Slaat alle producten hieronder op als Excel-bestand, in dezelfde kolommen als bij importeren — handig om in bulk te bewerken en daarna weer te importeren."
        >
          {exporting && <span className="spinner" aria-hidden="true" />}
          {exporting ? 'Bezig met exporteren…' : 'Excel exporteren'}
        </button>
        <button type="button" onClick={handleAdd}>
          + Product
        </button>
        <button
          type="button"
          onClick={handleResetAll}
          disabled={orderedCount === 0}
          title="Zet het aantal kaartjes voor ieder product terug op 0 — handig na een grote catalogus-import om weer met een schone lei te beginnen."
        >
          Alles op 0 zetten
        </button>
        <span className="products-summary">
          {orderedCount} product(en) klaar, {totalCards} kaartje(s) in totaal
        </span>
        <ProcessButton />
      </div>

      {importSummary && <p className="products-import-summary">✓ {importSummary}</p>}
      {importError && (
        <p className="products-import-error">
          ⚠ {importError}
          <button type="button" className="products-import-error-dismiss" onClick={() => setImportError(null)} title="Sluiten">
            ✕
          </button>
        </p>
      )}
      {exportSummary && <p className="products-import-summary">✓ {exportSummary}</p>}
      {exportError && (
        <p className="products-import-error">
          ⚠ {exportError}
          <button type="button" className="products-import-error-dismiss" onClick={() => setExportError(null)} title="Sluiten">
            ✕
          </button>
        </p>
      )}

      {products.length === 0 ? (
        <p className="empty-hint">Nog geen producten. Voeg er een toe of importeer een Excel-bestand.</p>
      ) : (
        <div className="products-table-wrap">
          <table className="products-table">
            <thead>
              <tr>
                <SortableHeader label="Naam" field="name" sort={sort} onSort={handleSort} />
                <SortableHeader label="Aantal kaartjes" field="quantity" sort={sort} onSort={handleSort} />
                <SortableHeader label="Actie" field="isPromotion" sort={sort} onSort={handleSort} />
                <SortableHeader label="Per gewicht" field="soldByWeight" sort={sort} onSort={handleSort} />
                <SortableHeader label="Gewicht" field="weightGrams" sort={sort} onSort={handleSort} />
                <SortableHeader label="Prijs per kilo" field="pricePerKg" sort={sort} onSort={handleSort} />
                <SortableHeader label="Weegschaalcode" field="scaleCode" sort={sort} onSort={handleSort} />
                <SortableHeader label="Bestelcode (leverancier)" field="supplierCode" sort={sort} onSort={handleSort} />
                <SortableHeader label="Top tekst" field="text1" sort={sort} onSort={handleSort} />
                <SortableHeader label="Tekst onder" field="text2" sort={sort} onSort={handleSort} />
                <SortableHeader label="Land van herkomst" field="countryOfOrigin" sort={sort} onSort={handleSort} />
                <SortableHeader
                  label="Verkocht per"
                  field="soldPer"
                  sort={sort}
                  onSort={handleSort}
                  title="Standaard automatisch bepaald op basis van Per gewicht/Gewicht (bijv. 'per stuk' of 'per 250 gram'). Typ hier iets anders (bijv. 'per zak') om dat te overschrijven — leegmaken herstelt de automatische tekst."
                />
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onOpen={() => setEditingProductId(product.id)}
                  onUpdate={(patch) => updateProduct(product.id, patch)}
                  onSetSoldPer={(value) => addOption(product.id, 'soldPer', value)}
                  onClearSoldPer={() => {
                    if (product.soldPer.favorite) removeOption(product.id, 'soldPer', product.soldPer.favorite)
                  }}
                />
              ))}
              {visibleProducts.length === 0 && (
                <tr className="products-table-empty-row">
                  <td colSpan={12}>Geen producten gevonden voor &quot;{search}&quot;.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingProductId && (
        <ProductEditModal key={editingProductId} productId={editingProductId} onClose={() => setEditingProductId(null)} />
      )}
    </div>
  )
}

interface SortableHeaderProps {
  label: string
  field: SortField
  sort: SortState | null
  onSort: (field: SortField) => void
  title?: string
}

function SortableHeader({ label, field, sort, onSort, title }: SortableHeaderProps): React.JSX.Element {
  const active = sort?.field === field
  return (
    <th className="products-th-sortable" onClick={() => onSort(field)} title={title}>
      {label}
      <span className="products-sort-indicator">{active ? (sort.direction === 'asc' ? ' ▲' : ' ▼') : ''}</span>
    </th>
  )
}

interface ProductRowProps {
  product: Product
  onOpen: () => void
  onUpdate: (patch: Partial<Pick<Product, 'quantity' | 'isPromotion' | 'soldByWeight' | 'pricePerKg' | 'weightGrams'>>) => void
  /** Sets an explicit "Verkocht per" override (see mergeProductRow.ts's effectiveSoldPer). */
  onSetSoldPer: (value: string) => void
  /** Clears the override, falling back to the automatic per-stuk/per-X-gram text. */
  onClearSoldPer: () => void
}

function ProductRow({ product, onOpen, onUpdate, onSetSoldPer, onClearSoldPer }: ProductRowProps): React.JSX.Element {
  const [quantityText, setQuantityText] = useState(String(product.quantity))
  const [priceText, setPriceText] = useState(product.pricePerKg === null ? '' : String(product.pricePerKg))
  const [weightText, setWeightText] = useState(product.weightGrams === null ? '' : String(product.weightGrams))
  const [soldPerText, setSoldPerText] = useState(effectiveSoldPer(product) ?? '')

  // This row stays mounted (same key=product.id) across edits made elsewhere — e.g. via the "+ Product"
  // modal right after creating it — so these draft buffers need to resync whenever the store's value
  // changes out from under them, not just once at mount.
  useEffect(() => setQuantityText(String(product.quantity)), [product.quantity])
  useEffect(() => setPriceText(product.pricePerKg === null ? '' : String(product.pricePerKg)), [product.pricePerKg])
  useEffect(() => setWeightText(product.weightGrams === null ? '' : String(product.weightGrams)), [product.weightGrams])
  useEffect(
    () => setSoldPerText(effectiveSoldPer(product) ?? ''),
    [product.soldPer.favorite, product.soldByWeight, product.weightGrams]
  )

  function commitQuantity(): void {
    const parsed = Math.max(0, Math.round(Number(quantityText)))
    if (Number.isNaN(parsed)) {
      setQuantityText(String(product.quantity))
      return
    }
    onUpdate({ quantity: parsed })
  }

  function commitPrice(): void {
    if (priceText.trim() === '') {
      onUpdate({ pricePerKg: null })
      return
    }
    const parsed = parseDecimalNl(priceText)
    if (parsed === null) {
      setPriceText(product.pricePerKg === null ? '' : String(product.pricePerKg))
      return
    }
    onUpdate({ pricePerKg: parsed })
  }

  function commitWeight(): void {
    if (weightText.trim() === '') {
      onUpdate({ weightGrams: null })
      return
    }
    const parsed = parseDecimalNl(weightText)
    if (parsed === null) {
      setWeightText(product.weightGrams === null ? '' : String(product.weightGrams))
      return
    }
    onUpdate({ weightGrams: Math.max(0, Math.round(parsed)) })
  }

  function commitSoldPer(): void {
    const trimmed = soldPerText.trim()
    const currentOverride = product.soldPer.favorite
    if (trimmed === currentOverride) {
      // No real change — but make sure the box reflects the actual effective value. Otherwise clearing
      // a box that had no override to begin with (just showing the automatic text) would leave it
      // visually blank even though the automatic text still applies.
      setSoldPerText(effectiveSoldPer(product) ?? '')
      return
    }
    if (!trimmed) {
      if (currentOverride) onClearSoldPer()
      return
    }
    onSetSoldPer(trimmed)
  }

  return (
    <tr className={product.quantity > 0 ? 'products-row-active' : undefined} onClick={onOpen}>
      <td>{product.name || <em>(naamloos)</em>}</td>
      <td onClick={(e) => e.stopPropagation()}>
        <input
          type="number"
          min={0}
          className="products-quantity-input"
          value={quantityText}
          onChange={(e) => setQuantityText(e.target.value)}
          onBlur={commitQuantity}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={product.isPromotion} onChange={(e) => onUpdate({ isPromotion: e.target.checked })} />
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={product.soldByWeight} onChange={(e) => onUpdate({ soldByWeight: e.target.checked })} />
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        {product.soldByWeight ? (
          <span className="products-weight-input-wrap">
            <input
              type="text"
              inputMode="numeric"
              className="products-weight-input"
              placeholder="—"
              value={weightText}
              onChange={(e) => setWeightText(e.target.value)}
              onBlur={commitWeight}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
            <span className="products-weight-suffix">gram</span>
          </span>
        ) : (
          <span className="empty-hint">—</span>
        )}
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          inputMode="decimal"
          className="products-price-input"
          placeholder="—"
          value={priceText}
          onChange={(e) => setPriceText(e.target.value)}
          onBlur={commitPrice}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </td>
      <td>{product.scaleCode}</td>
      <td>{product.supplierCode}</td>
      <td>{product.text1.favorite}</td>
      <td>{product.text2.favorite}</td>
      <td>{product.countryOfOrigin.favorite}</td>
      <td onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          className="products-soldper-input"
          placeholder={deriveSoldPer(product) ?? '—'}
          value={soldPerText}
          onChange={(e) => setSoldPerText(e.target.value)}
          onBlur={commitSoldPer}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </td>
    </tr>
  )
}

export default ProductsPage
