import { useState } from 'react'
import { useActiveSession } from '../hooks/useActiveSession'
import { notificationsBlocked } from '../lib/alerts'
import { useApp } from '../lib/context'
import { errorText } from '../lib/errors'
import { clock, timeOf } from '../lib/format'

export function TimerPanel() {
  const { me, settings } = useApp()
  const t = useActiveSession(me?.id)
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [stopping, setStopping] = useState(false)

  if (t.loading) return <section className="timer"><p className="muted">Nalagam …</p></section>

  const s = t.session
  const elapsed = s ? (t.serverNow - Date.parse(s.started_at)) / 1000 : 0
  const left = s ? (Date.parse(s.ping_deadline) - t.serverNow) / 1000 : 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await t.stop(note, file)
      setNote('')
      setFile(null)
      setStopping(false)
    } catch { /* shown below */ }
  }

  const form = (
    <form className="stop-form" onSubmit={submit}>
      <label>
        Kaj si naredil?
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          minLength={3}
          required
          placeholder="Npr. prepisal poglavje 3.2, uredil literaturo, 600 novih besed."
          autoFocus
        />
      </label>
      <label className="file">
        Slika (neobvezno)
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <div className="row">
        <button type="submit" className="primary" disabled={t.busy}>{t.busy ? 'Shranjujem …' : 'Shrani zapis'}</button>
        {t.phase !== 'needsNote' && <button type="button" onClick={() => setStopping(false)}>Nazaj</button>}
      </div>
    </form>
  )

  return (
    <section className={`timer phase-${t.phase}`}>
      {t.phase === 'idle' && (
        <>
          <p className="clock idle">0:00:00</p>
          <button className="primary big" onClick={t.start} disabled={t.busy}>Začni delati</button>
          <p className="hint">
            Med delom te bo stran vsakih {settings?.ping_min_minutes}–{settings?.ping_max_minutes} min vprašala, ali še delaš.
            Na odgovor imaš {settings?.ping_window_minutes} min. Šteje samo čas do zadnje potrditve.
          </p>
        </>
      )}

      {(t.phase === 'running' || t.phase === 'due') && s && (
        <>
          <p className="clock">{clock(elapsed)}</p>
          <p className="hint">
            Začetek ob {timeOf(s.started_at)} · potrjeno do {timeOf(s.confirmed_until)} · samodejni konec po {settings?.max_session_hours} h
          </p>

          {t.phase === 'due' && (
            <div className="checkin" role="alert">
              <p><strong>Še delaš?</strong> Potrdi v {Math.max(0, Math.ceil(left / 60))} min.</p>
              <button className="primary big" onClick={t.answer} disabled={t.busy}>Ja, še delam</button>
            </div>
          )}

          {stopping ? form : (
            <button onClick={() => setStopping(true)} disabled={t.busy}>Končaj sejo</button>
          )}
          {notificationsBlocked() && (
            <p className="warn">Obvestila so v brskalniku blokirana, zato boš preverjanje videl le na tej strani. Dovoli jih v nastavitvah strani.</p>
          )}
        </>
      )}

      {t.phase === 'needsNote' && s && (
        <>
          <p className="warn">
            {s.status === 'lapsed'
              ? `Seja se je ustavila, ker preverjanje ni bilo potrjeno. Šteje čas do ${timeOf(s.confirmed_until)}.`
              : 'Seja je dosegla najdaljše trajanje in se je ustavila.'}
            {' '}Dodaj zapis, preden začneš novo.
          </p>
          {form}
        </>
      )}

      {t.error && <p className="error">{errorText(t.error)}</p>}
    </section>
  )
}
