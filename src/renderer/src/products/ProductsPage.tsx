import { useMemo, useState } from 'react'
import { useDataStore } from '@renderer/state/dataStore'
import { useProjectStore } from '@renderer/state/projectStore'
import { useProductStore } from '@renderer/state/productStore'
import ProductEditModal from './ProductEditModal'

function ProductsPage(): React.JSX.Element {
  const products = useProductStore((state) => state.products)
  const addProduct = useProductStore((state) => state.addProduct)
  const upsertByOrderNumber = useProductStore((state) => state.upsertByOrderNumber)
  const headers = useDataStore((state) => state.headers)
  const orderNumberField = useProjectStore((state) => state.orderNumberField)
  const setOrderNumberField = useProjectStore((state) => state.setOrderNumberField)

  const [search, setSearch] = useState('')
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return products
    return products.filter((p) => p.name.toLowerCase().includes(query) || p.orderNumber.toLowerCase().includes(query))
  }, [products, search])

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
      setImportSummary(`${created} nieuw, ${updated} bijgewerkt (${rows.length} rijen verwerkt).`)
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
        <label className="field products-order-field">
          <span>Bestelnummer-kolom in Excel</span>
          <select value={orderNumberField ?? ''} onChange={(e) => setOrderNumberField(e.target.value || null)}>
            <option value="">— Kies een kolom —</option>
            {headers.map((header) => (
              <option key={header} value={header}>
                {header}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={handleImport} disabled={importing}>
          {importing ? 'Bezig…' : 'Excel importeren'}
        </button>
        <button type="button" onClick={handleAdd}>
          + Product
        </button>
      </div>

      {importSummary && <p className="products-import-summary">{importSummary}</p>}

      {headers.length === 0 && (
        <p className="empty-hint">
          Importeer eerst een prijslijst-Excel bij Ontwerpen om een bestelnummer-kolom te kunnen kiezen voor het
          koppelen van producten aan rijen.
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
                <tr key={product.id} onClick={() => setEditingProductId(product.id)}>
                  <td>{product.name || <em>(naamloos)</em>}</td>
                  <td>{product.orderNumber}</td>
                  <td>{product.scaleCode}</td>
                  <td>{product.text1.favorite}</td>
                  <td>{product.text2.favorite}</td>
                  <td>{product.countryOfOrigin.favorite}</td>
                  <td>{product.soldPer.favorite}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr className="products-table-empty-row">
                  <td colSpan={7}>Geen producten gevonden voor &quot;{search}&quot;.</td>
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

export default ProductsPage
