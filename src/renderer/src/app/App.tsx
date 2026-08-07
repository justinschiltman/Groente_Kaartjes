import { useEffect, useState } from 'react'
import EditorPage from '../editor/EditorPage'

function App(): React.JSX.Element {
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    window.api.getAppVersion().then(setVersion)
  }, [])

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
