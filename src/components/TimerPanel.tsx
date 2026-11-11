import { useState } from 'react'
import { notificationsBlocked } from '../lib/alerts'
import { useApp } from '../lib/context'
import { errorText } from '../lib/errors'
import { clock, hm, timeOf } from '../lib/format'
import { useTimer } from '../lib/timer'
import { Modal } from './Modal'

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
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [stopping, setStopping] = useState(false)

  if (t.loading) return <section className="card"><span className="phase-pill">Nalagam …</span><Clock seconds={0} /></section>

  const s = t.session
  const elapsed = s ? (t.serverNow - Date.parse(s.started_at)) / 1000 : 0
  const left = s ? (Date.parse(s.ping_deadline) - t.serverNow) / 1000 : 0
  const forced = t.phase === 'needsNote'
  // A due check-in takes over the screen; the half-written note survives in state.
  const modalOpen = forced || (stopping && t.phase === 'running')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await t.stop(note, file)
      setNote('')
      setFile(null)
      setStopping(false)
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
            <span className="phase-pill">Pripravljen</span>
            <Clock seconds={0} />
            <button className="big-btn" onClick={t.start} disabled={t.busy}>{t.busy ? 'ZAČENJAM …' : 'ZAČNI'}</button>
          </>
        )}

        {t.phase === 'running' && s && (
          <>
            <span className="phase-pill">Delaš</span>
            <Clock seconds={elapsed} />
            <p className="sub">
              Začetek ob <b>{timeOf(s.started_at)}</b> · potrjeno do <b>{timeOf(s.confirmed_until)}</b> · konec po <b>{settings?.max_session_hours} h</b>
            </p>
            <button className="big-btn" onClick={() => setStopping(true)} disabled={t.busy}>KONČAJ</button>
          </>
        )}

        {t.phase === 'due' && s && (
          <>
            <span className="phase-pill">Preverjanje</span>
            <p className="checkin-title">Še delaš?</p>
            <p className="countdown" role="alert">Potrdi v {mmss(left)}</p>
            <button className="big-btn" onClick={t.answer} disabled={t.busy}>JA, ŠE DELAM</button>
            <Clock seconds={elapsed} small />
          </>
        )}

        {forced && s && (
          <>
            <span className="phase-pill">Seja ustavljena</span>
            {s.credited_seconds != null && <p className="sub">Šteje <b>{hm(s.credited_seconds)}</b>.</p>}
          </>
        )}

        {(t.phase === 'running' || t.phase === 'due') && notificationsBlocked() && (
          <p className="sub warn-on">Obvestila so v brskalniku blokirana, zato boš preverjanje videl le na tej strani. Dovoli jih v nastavitvah strani.</p>
        )}
        {t.error && !modalOpen && <p className="sub warn-on">{errorText(t.error)}</p>}
      </section>

      {modalOpen && s && (
        <Modal labelledBy="stop-title" onClose={forced ? undefined : () => setStopping(false)}>
          <form className="modal-form" onSubmit={submit}>
            {forced && (
              <div className="alert">
                {s.status === 'lapsed'
                  ? `Seja se je ustavila, ker preverjanje ni bilo potrjeno. Šteje čas do ${timeOf(s.confirmed_until)}.`
                  : 'Seja je dosegla najdaljše trajanje in se je ustavila.'}
                {' '}Dodaj zapis, preden začneš novo.
              </div>
            )}
            <h2 id="stop-title">{forced ? 'Kaj si naredil?' : 'Konec seje'}</h2>
            <div className="chips">
              <span className="chip">⏱ {hm(s.credited_seconds ?? elapsed)}</span>
              <span className="chip">✔ {s.pings_answered} {s.pings_answered === 1 ? 'preverjanje' : 'preverjanj'}</span>
            </div>
            <label htmlFor="stop-note">Kaj si naredil?</label>
            <textarea
              id="stop-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
              minLength={3}
              required
              placeholder="Npr. prepisal poglavje 3.2, uredil literaturo, 600 novih besed."
              autoFocus
            />
            <label className="drop" htmlFor="stop-file">
              Slika kot dokaz (neobvezno)
              <input id="stop-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </label>
            {t.error && <p className="error">{errorText(t.error)}</p>}
            <div className="row end">
              {!forced && <button type="button" className="btn" onClick={() => setStopping(false)}>Nazaj na delo</button>}
              <button type="submit" className="btn primary" disabled={t.busy}>{t.busy ? 'Shranjujem …' : 'Shrani zapis'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
