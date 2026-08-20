import { useState } from 'react'
import { importImage, type ImageAsset } from '@renderer/assets/imageLoader'
import { useAssetStore } from '@renderer/state/assetStore'

interface ImageLibraryModalProps {
  onClose: () => void
  onPlaceImage: (asset: ImageAsset) => void
}

function ImageLibraryModal({ onClose, onPlaceImage }: ImageLibraryModalProps): React.JSX.Element {
  const imageAssets = useAssetStore((state) => state.imageAssets)
  const addImageAsset = useAssetStore((state) => state.addImageAsset)
  const [importing, setImporting] = useState(false)

  async function handleImport(): Promise<void> {
    setImporting(true)
    try {
      const asset = await importImage()
      if (asset) {
        addImageAsset(asset)
        onPlaceImage(asset)
        onClose()
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Afbeeldingen</h2>
          <button type="button" onClick={onClose} title="Sluiten">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <button type="button" onClick={handleImport} disabled={importing}>
            {importing ? 'Bezig…' : '+ Afbeelding importeren'}
          </button>

          {imageAssets.length === 0 ? (
            <p className="empty-hint">Je hebt nog geen afbeeldingen geïmporteerd.</p>
          ) : (
            <div className="image-library-grid">
              {imageAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="image-library-thumb"
                  onClick={() => {
                    onPlaceImage(asset)
                    onClose()
                  }}
                  title={asset.name}
                >
                  <img src={asset.blobUrl} alt={asset.name} />
                  <span>{asset.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImageLibraryModal
