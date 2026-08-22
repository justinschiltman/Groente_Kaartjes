import { useState } from 'react'
import { useProductStore } from '@renderer/state/productStore'
import type { MultiValueFieldKey } from '@shared/types/product'
import MultiOptionField from './MultiOptionField'

interface ProductEditModalProps {
  productId: string
  onClose: () => void
}

const MULTI_FIELD_CONFIG: { key: MultiValueFieldKey; label: string }[] = [
  { key: 'text1', label: 'Top tekst' },
  { key: 'text2', label: 'Tekst onder' },
  { key: 'countryOfOrigin', label: 'Land van herkomst' },
  { key: 'soldPer', label: 'Verkocht per' }
]

function ProductEditModal({ productId, onClose }: ProductEditModalProps): React.JSX.Element | null {
  const product = useProductStore((state) => state.products.find((p) => p.id === productId))
  const updateProduct = useProductStore((state) => state.updateProduct)
  const addOption = useProductStore((state) => state.addOption)
  const setFavorite = useProductStore((state) => state.setFavorite)
  const removeOption = useProductStore((state) => state.removeOption)
  const deleteProduct = useProductStore((state) => state.deleteProduct)

  const [name, setName] = useState(product?.name ?? '')
  const [orderNumber, setOrderNumber] = useState(product?.orderNumber ?? '')
  const [scaleCode, setScaleCode] = useState(product?.scaleCode ?? '')
  const [quantityText, setQuantityText] = useState(String(product?.quantity ?? 0))
  const [priceText, setPriceText] = useState(product?.pricePerKg === null || product?.pricePerKg === undefined ? '' : String(product.pricePerKg))

  if (!product) return null

  function commitName(): void {
    const trimmed = name.trim()
    if (trimmed !== product?.name) updateProduct(productId, { name: trimmed })
  }

  function commitOrderNumber(): void {
    const trimmed = orderNumber.trim()
    if (trimmed !== product?.orderNumber) updateProduct(productId, { orderNumber: trimmed })
  }

  function commitScaleCode(): void {
    const trimmed = scaleCode.trim()
    if (trimmed !== product?.scaleCode) updateProduct(productId, { scaleCode: trimmed })
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
    const parsed = Number(priceText.replace(',', '.'))
    if (Number.isNaN(parsed)) {
      setPriceText(product?.pricePerKg === null || product?.pricePerKg === undefined ? '' : String(product.pricePerKg))
      return
    }
    updateProduct(productId, { pricePerKg: parsed })
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
              <span>Bestelnummer</span>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                onBlur={commitOrderNumber}
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
          </div>

          {MULTI_FIELD_CONFIG.map(({ key, label }) => (
            <MultiOptionField
              key={key}
              label={label}
              field={product[key]}
              onAddOption={(value) => addOption(productId, key, value)}
              onSetFavorite={(value) => setFavorite(productId, key, value)}
              onRemoveOption={(value) => removeOption(productId, key, value)}
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
