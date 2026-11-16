import { useState } from 'react'
import { notificationsBlocked } from '../lib/alerts'
import { useApp } from '../lib/context'
import { errorText } from '../lib/errors'
import { clock, hm, timeOf } from '../lib/format'
import { workedSeconds } from '../lib/session'
import { useTimer } from '../lib/timer'
import { Modal } from './Modal'
import { useT } from '../lib/i18n'

/** Digits in fixed-width cells so the big clock doesn't wobble as it ticks. */
function Clock({ seconds, small }: { seconds: number; small?: boolean }) {
  return (
    <div className={`clock${small ? ' small' : ''}`} role="timer" aria-label={clock(seconds)}>
      {[...clock(seconds)].map((ch, i) => <span key={i} className={ch === ':' ? 'sep' : undefined}>{ch}</span>)}
    </div>
  )
}

export function TimerPanel() {
  const { settings } = useApp()
  const t = useTimer()
  const { t: tr } = useT()
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)

  if (t.loading) return <section className="card"><span className="phase-pill">{tr.timer.loading}</span><Clock seconds={0} /></section>

  const s = t.session
  const elapsed = s ? workedSeconds(s, t.serverNow) : 0
  const left = s ? (Date.parse(s.ping_deadline) - t.serverNow) / 1000 : 0
  const forced = t.phase === 'needsNote'
  const paused = t.phase === 'paused'
  // KONČAJ pauses on the server, so the dialog survives a reload. Resuming keeps the half-written note.
  const modalOpen = forced || paused
  const pauseLeft = s?.paused_at && settings
    ? (Date.parse(s.paused_at) + settings.max_pause_minutes * 60_000 - t.serverNow) / 1000
    : 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await t.stop(note, file)
      setNote('')
      setFile(null)
    } catch { /* shown in the modal */ }
  }

  const mmss = (sec: number) => {
    const v = Math.max(0, Math.floor(sec))
    return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`
  }

  return (
    <>
      <section className="card" aria-live="polite">
        {t.phase === 'idle' && (
          <>
            <span className="phase-pill">{tr.timer.ready}</span>
            <Clock seconds={0} />
            <button className="big-btn" onClick={t.start} disabled={t.busy}>{t.busy ? tr.timer.starting : tr.timer.start}</button>
          </>
        )}

        {t.phase === 'running' && s && (
          <>
            <span className="phase-pill">{tr.timer.working}</span>
            <Clock seconds={elapsed} />
            <p className="sub">
              {tr.timer.startedAt} <b>{timeOf(s.started_at)}</b> · {tr.timer.confirmedUntil} <b>{timeOf(s.confirmed_until)}</b> · {tr.timer.endsAfter} <b>{settings?.max_session_hours} h</b>
            </p>
            <button className="big-btn" onClick={t.pause} disabled={t.busy}>{tr.timer.stop}</button>
          </>
        )}

        {t.phase === 'due' && s && (
          <>
            <span className="phase-pill">{tr.timer.checkIn}</span>
            <p className="checkin-title">{tr.timer.stillWorking}</p>
            <p className="countdown" role="alert">{tr.timer.confirmIn(mmss(left))}</p>
            <button className="big-btn" onClick={t.answer} disabled={t.busy}>{tr.timer.yesStillWorking}</button>
            <Clock seconds={elapsed} small />
          </>
        )}

        {paused && s && (
          <>
            <span className="phase-pill">{tr.timer.paused}</span>
            <Clock seconds={elapsed} />
          </>
        )}

        {forced && s && (
          <>
            <span className="phase-pill">{tr.timer.stopped}</span>
            {s.credited_seconds != null && <p className="sub">{tr.timer.counted} <b>{hm(s.credited_seconds)}</b>.</p>}
          </>
        )}

        {(t.phase === 'running' || t.phase === 'due') && notificationsBlocked() && (
          <p className="sub warn-on">{tr.timer.notificationsBlocked}</p>
        )}
        {t.error && !modalOpen && <p className="sub warn-on">{errorText(t.error)}</p>}
      </section>

      {modalOpen && s && (
        <Modal labelledBy="stop-title">
          <form className="modal-form" onSubmit={submit}>
            {forced && (
              <div className="alert">
                {s.status === 'lapsed'
                  ? tr.timer.lapsed(timeOf(s.confirmed_until))
                  : s.status === 'completed'
                    ? tr.timer.pausedOut(timeOf(s.ended_at ?? s.confirmed_until))
                    : tr.timer.capped}
                {' '}{tr.timer.addNoteFirst}
              </div>
            )}
            <h2 id="stop-title">{forced ? tr.timer.whatDidYouDo : tr.timer.endSession}</h2>
            {paused && <p className="sub">{tr.timer.autoCloseIn(mmss(pauseLeft))}</p>}
            <div className="chips">
              <span className="chip">⏱ {hm(s.credited_seconds ?? elapsed)}</span>
              <span className="chip">✔ {tr.timer.checks(s.pings_answered)}</span>
            </div>
            <label htmlFor="stop-note">{tr.timer.whatDidYouDo}</label>
            <textarea
              id="stop-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
              minLength={3}
              required
              placeholder={tr.timer.notePlaceholder}
              autoFocus
            />
            <label className="drop" htmlFor="stop-file">
              {tr.timer.proofImage}
              <input id="stop-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </label>
            {t.error && <p className="error">{errorText(t.error)}</p>}
            <div className="row end">
              {paused && <button type="button" className="btn" onClick={t.resume} disabled={t.busy}>{tr.timer.backToWork}</button>}
              <button type="submit" className="btn primary" disabled={t.busy}>{t.busy ? tr.timer.saving : tr.timer.saveNote}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
