import { useEffect, useState } from 'react'
import { loadPersistedFonts } from '../assets/fontLoader'
import { loadPersistedImages } from '../assets/imageLoader'
import { useAssetStore } from '../state/assetStore'
import { STORAGE_KEY as PRODUCTS_STORAGE_KEY } from '../state/productStore'
import { STORAGE_KEY as PROJECT_STORAGE_KEY } from '../state/projectStore'
import EditorPage from '../editor/EditorPage'
import ProductsPage from '../products/ProductsPage'

type AppView = 'editor' | 'products'

function App(): React.JSX.Element {
  const [version, setVersion] = useState<string>('')
  const [view, setView] = useState<AppView>('editor')
  const setFontFamilies = useAssetStore((state) => state.setFontFamilies)
  const setImageAssets = useAssetStore((state) => state.setImageAssets)
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)

  useEffect(() => {
    window.api.getAppVersion().then(setVersion)
    loadPersistedFonts().then(setFontFamilies)
    loadPersistedImages().then(setImageAssets)
  }, [setFontFamilies, setImageAssets])

  // Everything this app remembers (ontwerpen + producten + eigen lettertypen/afbeeldingen) lives only
  // in this one installation's local storage/userData folder — it does NOT carry over if the app is
  // ever run a different way on the same computer (e.g. moving from the terminal/dev version to an
  // installed build), or moved to a different computer. This is the only way to bring it along.
  async function handleExportBackup(): Promise<void> {
    setBackupBusy(true)
    setBackupMessage(null)
    try {
      const project = localStorage.getItem(PROJECT_STORAGE_KEY)
      const products = localStorage.getItem(PRODUCTS_STORAGE_KEY)
      const result = await window.api.exportBackup({ project, products })
      if (result.canceled) return
      if (result.error) {
        setBackupMessage(`⚠ ${result.error}`)
        return
      }
      setBackupMessage(`✓ Back-up opgeslagen${result.filePath ? ` in ${result.filePath}` : ''}.`)
    } catch (error) {
      setBackupMessage(`⚠ ${error instanceof Error ? error.message : 'Onbekende fout bij het opslaan van de back-up.'}`)
    } finally {
      setBackupBusy(false)
    }
  }

  async function handleImportBackup(): Promise<void> {
    if (
      !window.confirm(
        'Dit vervangt alle ontwerpen en producten in DEZE installatie door de inhoud van het back-up-bestand. Dit kan niet ongedaan worden gemaakt. Doorgaan?'
      )
    ) {
      return
    }
    setBackupBusy(true)
    setBackupMessage(null)
    try {
      const result = await window.api.importBackup()
      if (result.canceled) {
        setBackupBusy(false)
        return
      }
      if (result.error) {
        setBackupMessage(`⚠ ${result.error}`)
        setBackupBusy(false)
        return
      }
      if (result.data?.project) localStorage.setItem(PROJECT_STORAGE_KEY, result.data.project)
      else localStorage.removeItem(PROJECT_STORAGE_KEY)
      if (result.data?.products) localStorage.setItem(PRODUCTS_STORAGE_KEY, result.data.products)
      else localStorage.removeItem(PRODUCTS_STORAGE_KEY)
      // Every store only reads localStorage once at startup, and fonts/images load via a separate
      // effect above — a full reload is the simplest way to pick up all of it consistently at once.
      window.location.reload()
    } catch (error) {
      setBackupMessage(`⚠ ${error instanceof Error ? error.message : 'Onbekende fout bij het importeren van de back-up.'}`)
      setBackupBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Groente Kaartjes</h1>
        {version && <span className="app-version">v{version}</span>}
        <nav className="app-nav">
          <button type="button" className={view === 'editor' ? 'active' : ''} onClick={() => setView('editor')}>
            Ontwerpen
          </button>
          <button type="button" className={view === 'products' ? 'active' : ''} onClick={() => setView('products')}>
            Producten
          </button>
        </nav>
        <div className="app-backup-actions">
          <button
            type="button"
            onClick={handleExportBackup}
            disabled={backupBusy}
            title="Slaat al je ontwerpen, producten en eigen lettertypen/afbeeldingen op in één bestand — handig om mee te nemen naar een andere installatie van de app."
          >
            Back-up exporteren
          </button>
          <button
            type="button"
            onClick={handleImportBackup}
            disabled={backupBusy}
            title="Vervangt alles in deze installatie door de inhoud van een eerder geëxporteerd back-up-bestand."
          >
            Back-up importeren
          </button>
        </div>
      </header>
      {backupMessage && (
        <p className={backupMessage.startsWith('⚠') ? 'app-backup-message error' : 'app-backup-message'}>
          {backupMessage}
          <button type="button" className="app-backup-message-dismiss" onClick={() => setBackupMessage(null)} title="Sluiten">
            ✕
          </button>
        </p>
      )}
      {view === 'editor' ? <EditorPage /> : <ProductsPage />}
    </div>
  )
}

export default App
