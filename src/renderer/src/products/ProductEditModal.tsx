import { useState } from 'react'
import { useProductStore } from '@renderer/state/productStore'
import type { MultiValueFieldKey } from '@shared/types/product'
import MultiOptionField from './MultiOptionField'

interface ProductEditModalProps {
  productId: string
  onClose: () => void
}

const MULTI_FIELD_CONFIG: { key: MultiValueFieldKey; label: string }[] = [
  { key: 'text1', label: 'Tekst 1' },
  { key: 'text2', label: 'Tekst 2' },
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

  if (!product) return null

  function commitName(): void {
    const trimmed = name.trim()
    if (trimmed !== product?.name) updateProduct(productId, { name: trimmed })
  }

  function commitOrderNumber(): void {
    const trimmed = orderNumber.trim()
    if (trimmed !== product?.orderNumber) updateProduct(productId, { orderNumber: trimmed })
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
