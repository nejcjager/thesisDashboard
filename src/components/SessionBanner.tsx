import { Link } from 'react-router-dom'
import { useTimer } from '../lib/timer'
import { clock } from '../lib/format'
import { workedSeconds } from '../lib/session'
import { useT } from '../lib/i18n'

/** On pages other than the timer: a reminder that a session runs, a check-in is due, or a note is missing. */
export function SessionBanner() {
  const t = useTimer()
  const s = t.session
  const { t: tr } = useT()

  if (t.phase === 'due') {
    return (
      <div className="banner banner-due" role="alert">
        <strong>{tr.timer.stillWorking}</strong>
        <button className="banner-btn" onClick={t.answer} disabled={t.busy}>{tr.banner.yesStillWorking}</button>
      </div>
    )
  }
  if (t.phase === 'needsNote') {
    return (
      <div className="banner banner-note" role="status">
        {tr.banner.stopped} <Link to="/">{tr.banner.addNote}</Link>
      </div>
    )
  }
  if (t.phase === 'paused' && s) {
    return (
      <Link to="/" className="banner banner-note" role="status">
        {tr.timer.paused} · {clock(workedSeconds(s, t.serverNow))} · {tr.banner.finishOrResume}
      </Link>
    )
  }
  if (t.phase === 'running' && s) {
    return (
      <Link to="/" className="banner banner-run">
        <span className="dot-live" aria-hidden="true" /> {tr.timer.working} · {clock(workedSeconds(s, t.serverNow))}
      </Link>
    )
  }
  return null
}
