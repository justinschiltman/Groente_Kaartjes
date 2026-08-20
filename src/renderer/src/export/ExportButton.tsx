import { useState } from 'react'
import { runExport, type ExportProgress } from './exportOrchestrator'

type ExportPhase = 'idle' | 'running' | 'done' | 'error'

function ExportButton(): React.JSX.Element {
  const [phase, setPhase] = useState<ExportPhase>('idle')
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  async function handleExport(): Promise<void> {
    setPhase('running')
    setProgress(null)
    setMessage(null)
    setWarning(null)
    try {
      const result = await runExport((p) => setProgress(p))
      if (result.canceled) {
        setPhase('idle')
      } else if (result.error) {
        setPhase('error')
        setMessage(result.error)
      } else {
        setPhase('done')
        setMessage(result.filePath ?? null)
        setWarning(result.warning ?? null)
      }
    } catch (error) {
      setPhase('error')
      setMessage(error instanceof Error ? error.message : 'Onbekende fout bij PDF-export.')
    }
  }

  return (
    <>
      <button type="button" onClick={handleExport} disabled={phase === 'running'}>
        {phase === 'running' ? 'Bezig…' : '⬇ Exporteren als PDF'}
      </button>

      {phase === 'running' && (
        <div className="modal-overlay">
          <div className="modal export-status-modal">
            <div className="modal-body">
              <h2>PDF wordt gemaakt…</h2>
              {progress ? (
                <>
                  <progress value={progress.rendered} max={progress.total} />
                  <p>
                    {progress.rendered} van {progress.total} kaartjes
                  </p>
                </>
              ) : (
                <p>Bezig met starten…</p>
              )}
            </div>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="modal-overlay" onClick={() => setPhase('idle')}>
          <div className="modal export-status-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>PDF geëxporteerd</h2>
              <button type="button" onClick={() => setPhase('idle')} title="Sluiten">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Het bestand is opgeslagen{message ? ':' : '.'}
                {message && <strong className="export-filepath"> {message}</strong>}
              </p>
              {warning && <p className="export-warning">{warning}</p>}
            </div>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="modal-overlay" onClick={() => setPhase('idle')}>
          <div className="modal export-status-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Exporteren mislukt</h2>
              <button type="button" onClick={() => setPhase('idle')} title="Sluiten">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="empty-hint">{message}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ExportButton
