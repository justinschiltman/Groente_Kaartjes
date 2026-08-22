import { useMemo, useState } from 'react'
import { useProductStore } from '@renderer/state/productStore'
import type { Product } from '@shared/types/product'
import ProcessButton from '../export/ProcessButton'
import ProductEditModal from './ProductEditModal'

function ProductsPage(): React.JSX.Element {
  const products = useProductStore((state) => state.products)
  const addProduct = useProductStore((state) => state.addProduct)
  const updateProduct = useProductStore((state) => state.updateProduct)
  const upsertByOrderNumber = useProductStore((state) => state.upsertByOrderNumber)

  const [search, setSearch] = useState('')
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<string | null>(null)

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

  async function handleImport(): Promise<void> {
    setImporting(true)
    setImportSummary(null)
    try {
      const rows = await window.api.importProducts()
      if (!rows) return
      let created = 0
      let updated = 0
      for (const row of rows) {
        const outcome = upsertByOrderNumber(row)
        if (outcome === 'created') created++
        else updated++
      }
      setImportSummary(`${created} nieuw, ${updated} bijgewerkt (${rows.length} rijen verwerkt) — allemaal op 1 kaartje gezet.`)
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
        <button type="button" onClick={handleImport} disabled={importing}>
          {importing ? 'Bezig…' : 'Excel importeren'}
        </button>
        <button type="button" onClick={handleAdd}>
          + Product
        </button>
        <span className="products-summary">
          {orderedCount} product(en) klaar, {totalCards} kaartje(s) in totaal
        </span>
        <ProcessButton />
      </div>

      {importSummary && <p className="products-import-summary">{importSummary}</p>}

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
                  <td colSpan={11}>Geen producten gevonden voor &quot;{search}&quot;.</td>
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
  onUpdate: (patch: Partial<Pick<Product, 'quantity' | 'isPromotion' | 'soldByWeight' | 'pricePerKg'>>) => void
}

function ProductRow({ product, onOpen, onUpdate }: ProductRowProps): React.JSX.Element {
  const [quantityText, setQuantityText] = useState(String(product.quantity))
  const [priceText, setPriceText] = useState(product.pricePerKg === null ? '' : String(product.pricePerKg))

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
    const parsed = Number(priceText.replace(',', '.'))
    if (Number.isNaN(parsed)) {
      setPriceText(product.pricePerKg === null ? '' : String(product.pricePerKg))
      return
    }
    onUpdate({ pricePerKg: parsed })
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
