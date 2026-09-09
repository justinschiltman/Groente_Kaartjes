import { useEffect, useRef, useState } from 'react'
import { formatCurrencyNl } from '@shared/format'
import type { Product, ProductImportRow } from '@shared/types/product'

interface ImportTally {
  created: number
  linked: number
  skipped: number
}

interface ImportReviewModalProps {
  rows: ProductImportRow[]
  products: Product[]
  onCreate: (row: ProductImportRow) => void
  onLink: (row: ProductImportRow, productId: string) => void
  onDone: (tally: ImportTally) => void
}

interface PendingEntry {
  row: ProductImportRow
  key: number
}

function rowSummary(row: ProductImportRow): string {
  const parts: string[] = []
  if (row.supplierCode) parts.push(`Bestelcode ${row.supplierCode}`)
  if (row.countryOfOrigin) parts.push(row.countryOfOrigin)
  if (row.pricePerKg !== undefined) parts.push(formatCurrencyNl(row.pricePerKg))
  if (row.isPromotion) parts.push('Actie')
  return parts.join(' · ')
}

/** Enough context about an EXISTING product to tell it apart from similarly-named ones when deciding
 * whether an unmatched import row is actually the same item — shown per candidate in the link-search
 * results below. Bestelcode lists every saved option (not just the favorite), since seeing a code
 * already sitting there un-favorited is itself useful disambiguating information. */
function productSummary(p: Product): string {
  const parts: string[] = []
  if (p.supplierCode.options.length > 0) parts.push(`Bestelcode ${p.supplierCode.options.join(', ')}`)
  parts.push(p.soldByWeight ? 'Per gewicht' : 'Per stuk')
  if (p.text2.favorite) parts.push(p.text2.favorite)
  return parts.join(' · ')
}

/** Shown after an "Excel importeren" whose rows didn't all match an existing product on Bestelcode —
 * see productStore.ts's previewImport. Rather than silently creating a new product for every
 * non-match (which, once a catalog is largely built up, is more often a near-duplicate — a typo'd
 * code, or a product that's already in there under a different code — than something genuinely new),
 * this lets the user resolve each one by hand: create it as new, attach it to an existing product they
 * recognize it as, or skip it entirely. Rows that DID match were already applied before this modal
 * ever opens (see ProductsPage.tsx's handleImport) — nothing here can undo those. */
function ImportReviewModal({ rows, products, onCreate, onLink, onDone }: ImportReviewModalProps): React.JSX.Element {
  const [remaining, setRemaining] = useState<PendingEntry[]>(() => rows.map((row, key) => ({ row, key })))
  const [linkingKey, setLinkingKey] = useState<number | null>(null)
  const [linkQuery, setLinkQuery] = useState('')
  // Mutated synchronously on every resolution and read exactly once, when `remaining` empties out —
  // avoids relying on separately-updated React state for the final tally, which would risk reading a
  // stale value if the last resolution's onDone fired before that state's own update had settled.
  const tallyRef = useRef<ImportTally>({ created: 0, linked: 0, skipped: 0 })
  // Guards against calling onDone twice — e.g. if the parent re-renders with a new onDone identity
  // after remaining has already emptied out, but before it's had a chance to unmount this modal.
  const doneRef = useRef(false)

  useEffect(() => {
    if (remaining.length === 0 && !doneRef.current) {
      doneRef.current = true
      onDone(tallyRef.current)
    }
  }, [remaining, onDone])

  function resolve(key: number, kind: keyof ImportTally): void {
    tallyRef.current[kind]++
    setRemaining((prev) => prev.filter((entry) => entry.key !== key))
    setLinkingKey(null)
    setLinkQuery('')
  }

  function skipAllAndClose(): void {
    tallyRef.current.skipped += remaining.length
    setRemaining([])
  }

  // Escape hatch for the opposite case from skipAllAndClose: a big, deliberate catalog-building
  // import (e.g. onboarding a new supplier's full product list) where every remaining row really is
  // new, and clicking "+ Nieuw product aanmaken" one row at a time would just be tedious — still an
  // explicit, reviewed action (the list is right there above it), not the old silent auto-create.
  function createAllAndClose(): void {
    for (const { row } of remaining) onCreate(row)
    tallyRef.current.created += remaining.length
    setRemaining([])
  }

  const linkMatches = linkQuery.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(linkQuery.trim().toLowerCase())).slice(0, 8)
    : []

  return (
    <div className="modal-overlay">
      <div className="modal import-review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nieuwe producten controleren</h2>
          <button type="button" onClick={skipAllAndClose} title="Resterende rijen overslaan en sluiten">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p className="empty-hint">
            Deze {remaining.length} rij(en) uit het Excel-bestand matchen geen bestaand product op Bestelcode. Kies per rij of
            het echt een nieuw product is, of dat het bij een bestaand product hoort.
          </p>
          <div className="import-review-bulk-actions">
            <button type="button" onClick={createAllAndClose}>
              Alles hieronder aanmaken als nieuw product
            </button>
          </div>
          <ul className="import-review-list">
            {remaining.map(({ row, key }) => (
              <li key={key} className="import-review-item">
                <div className="import-review-info">
                  <strong>{row.name || <em>(naamloos)</em>}</strong>
                  <span className="empty-hint">{rowSummary(row)}</span>
                </div>
                {linkingKey === key ? (
                  <div className="import-review-link-search">
                    <div className="import-review-link-search-row">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Zoek bestaand product op naam…"
                        value={linkQuery}
                        onChange={(e) => setLinkQuery(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLinkingKey(null)
                          setLinkQuery('')
                        }}
                      >
                        Annuleren
                      </button>
                    </div>
                    {linkQuery.trim() && (
                      <ul className="import-review-link-results">
                        {linkMatches.length === 0 ? (
                          <li className="empty-hint">Geen producten gevonden.</li>
                        ) : (
                          linkMatches.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  onLink(row, p.id)
                                  resolve(key, 'linked')
                                }}
                              >
                                <strong>{p.name || '(naamloos)'}</strong>
                                <span className="empty-hint">{productSummary(p)}</span>
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="import-review-actions">
                    <button
                      type="button"
                      onClick={() => {
                        onCreate(row)
                        resolve(key, 'created')
                      }}
                    >
                      + Nieuw product aanmaken
                    </button>
                    <button type="button" onClick={() => setLinkingKey(key)}>
                      Koppelen aan bestaand…
                    </button>
                    <button type="button" className="danger" onClick={() => resolve(key, 'skipped')}>
                      Overslaan
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default ImportReviewModal
