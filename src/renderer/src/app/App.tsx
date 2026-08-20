import { useEffect, useState } from 'react'
import { loadPersistedFonts } from '../assets/fontLoader'
import { useAssetStore } from '../state/assetStore'
import EditorPage from '../editor/EditorPage'
import ProductsPage from '../products/ProductsPage'

type AppView = 'editor' | 'products'

function App(): React.JSX.Element {
  const [version, setVersion] = useState<string>('')
  const [view, setView] = useState<AppView>('editor')
  const setFontFamilies = useAssetStore((state) => state.setFontFamilies)

  useEffect(() => {
    window.api.getAppVersion().then(setVersion)
    loadPersistedFonts().then(setFontFamilies)
  }, [setFontFamilies])

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
      </header>
      {view === 'editor' ? <EditorPage /> : <ProductsPage />}
    </div>
  )
}

export default App
