import { useEffect, useMemo, useState } from 'react'
import { useProductStore } from '@renderer/state/productStore'
import { parseDecimalNl } from '@shared/format'
import type { Product } from '@shared/types/product'
import ProcessButton from '../export/ProcessButton'
import ProductEditModal from './ProductEditModal'

function ProductsPage(): React.JSX.Element {
  const products = useProductStore((state) => state.products)
  const addProduct = useProductStore((state) => state.addProduct)
  const updateProduct = useProductStore((state) => state.updateProduct)
  const upsertByOrderNumber = useProductStore((state) => state.upsertByOrderNumber)
  const resetAllQuantities = useProductStore((state) => state.resetAllQuantities)

  const [search, setSearch] = useState('')
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return products
    return products.filter((p) => p.name.toLowerCase().includes(query) || p.orderNumber.toLowerCase().includes(query))
  }, [products, search])

  const orderedCount = products.filter((p) => p.quantity > 0).length
  const totalCards = products.reduce((sum, p) => sum + p.quantity, 0)

  function handleAdd(): void {
    setEditingProductId(addProduct())
  }

  function handleResetAll(): void {
    if (orderedCount === 0) return
    if (!window.confirm(`Aantal kaartjes voor alle ${orderedCount} klaarstaande product(en) op 0 zetten?`)) return
    resetAllQuantities()
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
          `Geen enkele rij herkend (${skipped} rij(en) overgeslagen). Controleer of de kolom "Bestelnummer" bestaat en die naam heeft — dat is de enige verplichte kolom.`
        )
        return
      }
      if (rows.length === 0) {
        setImportError('Dit Excel-bestand bevat geen productrijen om te importeren.')
        return
      }

      let created = 0
      let updated = 0
      for (const row of rows) {
        const outcome = upsertByOrderNumber(row)
        if (outcome === 'created') created++
        else updated++
      }
      const skippedNote = skipped > 0 ? `, ${skipped} rij(en) overgeslagen (geen Bestelnummer)` : ''
      setImportSummary(`${created} nieuw, ${updated} bijgewerkt (${rows.length} rijen verwerkt${skippedNote}) — allemaal op 1 kaartje gezet.`)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Onbekende fout bij het importeren.')
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
          placeholder="Zoeken op naam of bestelnummer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className={importing ? 'products-import-button importing' : 'products-import-button'} onClick={handleImport} disabled={importing}>
          {importing && <span className="spinner" aria-hidden="true" />}
          {importing ? 'Bezig met importeren…' : 'Excel importeren'}
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

      {products.length === 0 ? (
        <p className="empty-hint">Nog geen producten. Voeg er een toe of importeer een Excel-bestand.</p>
      ) : (
        <div className="products-table-wrap">
          <table className="products-table">
            <thead>
              <tr>
                <th>Naam</th>
                <th>Aantal kaartjes</th>
                <th>Actie</th>
                <th>Per gewicht</th>
                <th>Gewicht</th>
                <th>Prijs per kilo</th>
                <th>Bestelnummer</th>
                <th>Weegschaalcode</th>
                <th>Top tekst</th>
                <th>Tekst onder</th>
                <th>Land van herkomst</th>
                <th>Verkocht per</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onOpen={() => setEditingProductId(product.id)}
                  onUpdate={(patch) => updateProduct(product.id, patch)}
                />
              ))}
              {filtered.length === 0 && (
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

interface ProductRowProps {
  product: Product
  onOpen: () => void
  onUpdate: (patch: Partial<Pick<Product, 'quantity' | 'isPromotion' | 'soldByWeight' | 'pricePerKg' | 'weightGrams'>>) => void
}

function ProductRow({ product, onOpen, onUpdate }: ProductRowProps): React.JSX.Element {
  const [quantityText, setQuantityText] = useState(String(product.quantity))
  const [priceText, setPriceText] = useState(product.pricePerKg === null ? '' : String(product.pricePerKg))
  const [weightText, setWeightText] = useState(product.weightGrams === null ? '' : String(product.weightGrams))

  // This row stays mounted (same key=product.id) across edits made elsewhere — e.g. via the "+ Product"
  // modal right after creating it — so these draft buffers need to resync whenever the store's value
  // changes out from under them, not just once at mount.
  useEffect(() => setQuantityText(String(product.quantity)), [product.quantity])
  useEffect(() => setPriceText(product.pricePerKg === null ? '' : String(product.pricePerKg)), [product.pricePerKg])
  useEffect(() => setWeightText(product.weightGrams === null ? '' : String(product.weightGrams)), [product.weightGrams])

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
      <td>{product.orderNumber}</td>
      <td>{product.scaleCode}</td>
      <td>{product.text1.favorite}</td>
      <td>{product.text2.favorite}</td>
      <td>{product.countryOfOrigin.favorite}</td>
      <td>{product.soldPer.favorite}</td>
    </tr>
  )
}

export default ProductsPage
