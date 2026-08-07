import { useEffect, useState } from 'react'
import { loadPersistedFonts } from '../assets/fontLoader'
import { useAssetStore } from '../state/assetStore'
import EditorPage from '../editor/EditorPage'

function App(): React.JSX.Element {
  const [version, setVersion] = useState<string>('')
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
      </header>
      <EditorPage />
    </div>
  )
}

export default App
