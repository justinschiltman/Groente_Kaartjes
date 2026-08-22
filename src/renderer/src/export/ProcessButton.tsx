import { useState } from 'react'
import { checkProductsForExport, runExport, type ExportProgress, type IncompleteProduct, type ResolvedCard } from './exportOrchestrator'

type Phase = 'idle' | 'confirm' | 'running' | 'done' | 'error'

function ProcessButton(): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>('idle')
  const [pendingCards, setPendingCards] = useState<ResolvedCard[]>([])
  const [incomplete, setIncomplete] = useState<IncompleteProduct[]>([])
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function handleClick(): void {
    const { ready, incomplete: missing } = checkProductsForExport()
    if (ready.length === 0 && missing.length === 0) {
      setPhase('error')
      setMessage('Geen kaartjes om te verwerken. Zet bij een product een aantal kaartjes op minstens 1.')
      return
    }
    if (missing.length > 0) {
      setPendingCards(ready)
      setIncomplete(missing)
      setPhase('confirm')
      return
    }
    void process(ready)
  }

  async function process(cards: ResolvedCard[]): Promise<void> {
    setPhase('running')
    setProgress(null)
    setMessage(null)
    try {
      const result = await runExport(cards, (p) => setProgress(p))
      if (result.canceled) {
        setPhase('idle')
      } else if (result.error) {
        setPhase('error')
        setMessage(result.error)
      } else {
        setPhase('done')
        setMessage(result.filePath ?? null)
      }
    } catch (error) {
      setPhase('error')
      setMessage(error instanceof Error ? error.message : 'Onbekende fout bij verwerken.')
    }
  }

  const totalCards = pendingCards.reduce((sum, c) => sum + c.product.quantity, 0)

  return (
    <>
      <button type="button" className="process-button" onClick={handleClick} disabled={phase === 'running'}>
        {phase === 'running' ? 'Bezig…' : '⚙ Verwerken'}
      </button>

      {phase === 'confirm' && (
        <div className="modal-overlay" onClick={() => setPhase('idle')}>
          <div className="modal export-status-modal process-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Sommige producten missen gegevens</h2>
              <button type="button" onClick={() => setPhase('idle')} title="Sluiten">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                {incomplete.length} product(en) hebben een leeg veld dat het gekozen ontwerp nodig heeft, en
                worden overgeslagen als je doorgaat:
              </p>
              <ul className="incomplete-products-list">
                {incomplete.map((item, i) => (
                  <li key={i}>
                    <strong>{item.productName}</strong>: {item.missingFields.join(', ')}
                  </li>
                ))}
              </ul>
              {pendingCards.length > 0 && (
                <p>
                  De overige {pendingCards.length} product(en) ({totalCards} kaartje(s)) kunnen wel verwerkt
                  worden.
                </p>
              )}
              <div className="modal-actions">
                <button type="button" onClick={() => setPhase('idle')}>
                  Terug, ik pas het aan
                </button>
                <button type="button" disabled={pendingCards.length === 0} onClick={() => void process(pendingCards)}>
                  Toch doorgaan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <p className="empty-hint">Verwerkte producten staan weer op 0 kaartjes.</p>
            </div>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="modal-overlay" onClick={() => setPhase('idle')}>
          <div className="modal export-status-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Verwerken mislukt</h2>
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

export default ProcessButton
