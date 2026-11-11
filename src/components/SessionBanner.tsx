import { Link } from 'react-router-dom'
import { useTimer } from '../lib/timer'
import { clock } from '../lib/format'

/** On pages other than the timer: a reminder that a session runs, a check-in is due, or a note is missing. */
export function SessionBanner() {
  const t = useTimer()
  const s = t.session

  if (t.phase === 'due') {
    return (
      <div className="banner banner-due" role="alert">
        <strong>Še delaš?</strong>
        <button className="banner-btn" onClick={t.answer} disabled={t.busy}>Ja, še delam</button>
      </div>
    )
  }
  if (t.phase === 'needsNote') {
    return (
      <div className="banner banner-note" role="status">
        Seja se je ustavila. <Link to="/">Dodaj zapis</Link>
      </div>
    )
  }
  if (t.phase === 'running' && s) {
    return (
      <Link to="/" className="banner banner-run">
        <span className="dot-live" aria-hidden="true" /> Delaš · {clock((t.serverNow - Date.parse(s.started_at)) / 1000)}
      </Link>
    )
  }
  return null
}
