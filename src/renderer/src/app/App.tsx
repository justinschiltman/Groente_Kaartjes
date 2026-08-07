import { useEffect, useState } from 'react'

function App(): React.JSX.Element {
  const [version, setVersion] = useState<string>('...')

  useEffect(() => {
    window.api.getAppVersion().then(setVersion)
  }, [])

  return (
    <div className="app-shell">
      <h1>Groente Kaartjes</h1>
      <p>Prijskaartjes ontwerpen — v{version}</p>
    </div>
  )
}

export default App
