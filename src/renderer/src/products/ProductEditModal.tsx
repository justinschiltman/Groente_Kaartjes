import { useState } from 'react'
import { useProductStore } from '@renderer/state/productStore'
import { parseDecimalNl } from '@shared/format'
import { deriveSoldPer } from '@shared/mergeProductRow'
import type { MultiValueFieldKey } from '@shared/types/product'
import MultiOptionField from './MultiOptionField'

interface ProductEditModalProps {
  productId: string
  onClose: () => void
}

// "Verkocht per" used to be here too, as a manually-typed MultiOptionField — it's now derived
// automatically from Per gewicht/Gewicht (see deriveSoldPer) and shown as a read-only line instead.
const MULTI_FIELD_CONFIG: { key: MultiValueFieldKey; label: string; allowLineBreaks?: boolean }[] = [
  { key: 'text1', label: 'Top tekst' },
  { key: 'text2', label: 'Tekst onder', allowLineBreaks: true },
  { key: 'countryOfOrigin', label: 'Land van herkomst' }
]

function ProductEditModal({ productId, onClose }: ProductEditModalProps): React.JSX.Element | null {
  const product = useProductStore((state) => state.products.find((p) => p.id === productId))
  const updateProduct = useProductStore((state) => state.updateProduct)
  const addOption = useProductStore((state) => state.addOption)
  const setFavorite = useProductStore((state) => state.setFavorite)
  const removeOption = useProductStore((state) => state.removeOption)
  const renameOption = useProductStore((state) => state.renameOption)
  const deleteProduct = useProductStore((state) => state.deleteProduct)

  const [name, setName] = useState(product?.name ?? '')
  const [scaleCode, setScaleCode] = useState(product?.scaleCode ?? '')
  const [supplierCode, setSupplierCode] = useState(product?.supplierCode ?? '')
  const [quantityText, setQuantityText] = useState(String(product?.quantity ?? 0))
  const [priceText, setPriceText] = useState(product?.pricePerKg === null || product?.pricePerKg === undefined ? '' : String(product.pricePerKg))
  const [weightText, setWeightText] = useState(
    product?.weightGrams === null || product?.weightGrams === undefined ? '' : String(product.weightGrams)
  )

  if (!product) return null

  function commitName(): void {
    const trimmed = name.trim()
    if (trimmed !== product?.name) updateProduct(productId, { name: trimmed })
  }

  function commitScaleCode(): void {
    const trimmed = scaleCode.trim()
    if (trimmed !== product?.scaleCode) updateProduct(productId, { scaleCode: trimmed })
  }

  function commitSupplierCode(): void {
    const trimmed = supplierCode.trim()
    if (trimmed !== product?.supplierCode) updateProduct(productId, { supplierCode: trimmed })
  }

  function commitQuantity(): void {
    const parsed = Math.max(0, Math.round(Number(quantityText)))
    if (Number.isNaN(parsed)) {
      setQuantityText(String(product?.quantity ?? 0))
      return
    }
    updateProduct(productId, { quantity: parsed })
  }

  function commitPrice(): void {
    if (priceText.trim() === '') {
      updateProduct(productId, { pricePerKg: null })
      return
    }
    const parsed = parseDecimalNl(priceText)
    if (parsed === null) {
      setPriceText(product?.pricePerKg === null || product?.pricePerKg === undefined ? '' : String(product.pricePerKg))
      return
    }
    updateProduct(productId, { pricePerKg: parsed })
  }

  function commitWeight(): void {
    if (weightText.trim() === '') {
      updateProduct(productId, { weightGrams: null })
      return
    }
    const parsed = parseDecimalNl(weightText)
    if (parsed === null) {
      setWeightText(product?.weightGrams === null || product?.weightGrams === undefined ? '' : String(product.weightGrams))
      return
    }
    updateProduct(productId, { weightGrams: Math.max(0, Math.round(parsed)) })
  }

  function handleDelete(): void {
    if (!window.confirm(`Weet je zeker dat je "${product?.name || 'dit product'}" wilt verwijderen?`)) return
    deleteProduct(productId)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal product-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{product.name || 'Nieuw product'}</h2>
          <button type="button" onClick={onClose} title="Sluiten">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <label className="field">
              <span>Naam</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            </label>
            <label className="field">
              <span>Weegschaalcode</span>
              <input
                type="text"
                value={scaleCode}
                onChange={(e) => setScaleCode(e.target.value)}
                onBlur={commitScaleCode}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            </label>
            <label className="field">
              <span>Bestelcode (leverancier)</span>
              <input
                type="text"
                value={supplierCode}
                onChange={(e) => setSupplierCode(e.target.value)}
                onBlur={commitSupplierCode}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Aantal kaartjes</span>
              <input
                type="number"
                min={0}
                value={quantityText}
                onChange={(e) => setQuantityText(e.target.value)}
                onBlur={commitQuantity}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            </label>
            <label className="field">
              <span>Prijs per kilo</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="—"
                value={priceText}
                onChange={(e) => setPriceText(e.target.value)}
                onBlur={commitPrice}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            </label>
          </div>

          <div className="field-row toggle-row">
            <label className="field checkbox-field">
              <input
                type="checkbox"
                checked={product.isPromotion}
                onChange={(e) => updateProduct(productId, { isPromotion: e.target.checked })}
              />
              <span>Actie</span>
            </label>
            <label className="field checkbox-field">
              <input
                type="checkbox"
                checked={product.soldByWeight}
                onChange={(e) => updateProduct(productId, { soldByWeight: e.target.checked })}
              />
              <span>Per gewicht</span>
            </label>
            {product.soldByWeight && (
              <label className="field">
                <span>Gewicht</span>
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
              </label>
            )}
          </div>

          <p className="empty-hint">Verkocht per: {deriveSoldPer(product) ?? '— (vul eerst Gewicht in)'}</p>

          {MULTI_FIELD_CONFIG.map(({ key, label, allowLineBreaks }) => (
            <MultiOptionField
              key={key}
              label={label}
              field={product[key]}
              allowLineBreaks={allowLineBreaks}
              onAddOption={(value) => addOption(productId, key, value)}
              onSetFavorite={(value) => setFavorite(productId, key, value)}
              onRemoveOption={(value) => removeOption(productId, key, value)}
              onRenameOption={(oldValue, newValue) => renameOption(productId, key, oldValue, newValue)}
            />
          ))}

          <button type="button" className="danger product-delete-button" onClick={handleDelete}>
            Product verwijderen
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductEditModal
