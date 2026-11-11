import { useState } from 'react'
import { api } from '../lib/api'
import { useApp } from '../lib/context'
import { errorText } from '../lib/errors'
import { dateOf, hm, timeOf } from '../lib/format'
import type { SessionWithSocial } from '../lib/types'
import { Name } from './Name'

const EMOJI = ['👏', '🔥', '☕', '🤔']

const statusText: Record<string, string> = {
  active: 'v teku',
  lapsed: 'zamujeno preverjanje',
  capped: 'samodejno ustavljeno (omejitev)',
  voided: 'razveljavljeno',
}

export function SessionEntry({ s, onChange }: { s: SessionWithSocial; onChange?: () => void }) {
  const { me, byId } = useApp()
  const [doubting, setDoubting] = useState(false)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const mine = me?.id === s.user_id
  const myDoubt = s.doubts.find(d => d.user_id === me?.id)

  const run = async (fn: () => Promise<unknown>) => {
    setErr(null)
    try { await fn(); onChange?.() } catch (e) { setErr(errorText(e)) }
  }

  const counts = EMOJI.map(e => ({
    e,
    n: s.reactions.filter(r => r.emoji === e).length,
    mine: s.reactions.some(r => r.emoji === e && r.user_id === me?.id),
  }))

  return (
    <article className={`entry status-${s.status}`}>
      <header>
        <Name id={s.user_id} />
        <span className="when">
          {dateOf(s.started_at)}, {timeOf(s.started_at)}{s.ended_at && `–${timeOf(s.ended_at)}`}
        </span>
        <span className="dur">{s.credited_seconds != null ? hm(s.credited_seconds) : '…'}</span>
      </header>

      {s.status !== 'completed' && <p className="status">{statusText[s.status]}</p>}
      {s.status === 'voided' && s.void_reason && <p className="status">Razlog: {s.void_reason}</p>}

      {s.note ? <p className="note">{s.note}</p> : s.status !== 'active' && <p className="note muted">Brez zapisa.</p>}
      {s.image_path && (
        <a href={api.proofUrl(s.image_path)} target="_blank" rel="noreferrer" className="proof">
          <img src={api.proofUrl(s.image_path)} alt="Dokaz dela" loading="lazy" />
        </a>
      )}

      <p className="meta">
        Potrjenih preverjanj: {s.pings_answered}
      </p>

      {s.doubts.length > 0 && (
        <ul className="doubts">
          {s.doubts.map(d => (
            <li key={d.user_id}>
              <strong>{byId.get(d.user_id)?.display_name ?? '?'} dvomi:</strong> {d.reason}
            </li>
          ))}
        </ul>
      )}

      {s.status !== 'active' && (
        <footer>
          {counts.map(c => (
            <button
              key={c.e}
              className={`react${c.mine ? ' on' : ''}`}
              onClick={() => run(() => api.react(s.id, c.e, !c.mine))}
              aria-pressed={c.mine}
            >
              {c.e}{c.n > 0 && <span>{c.n}</span>}
            </button>
          ))}
          <span className="spacer" />
          {!mine && s.status !== 'voided' && (myDoubt
            ? <button className="link" onClick={() => run(() => api.withdrawDoubt(s.id, me!.id))}>umakni dvom</button>
            : <button className="link" onClick={() => setDoubting(v => !v)}>dvomim</button>)}
        </footer>
      )}

      {doubting && !myDoubt && (
        <form
          className="inline"
          onSubmit={e => {
            e.preventDefault()
            run(async () => { await api.doubt(s.id, reason.trim()); setDoubting(false); setReason('') })
          }}
        >
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Zakaj dvomiš?" minLength={3} required autoFocus />
          <button type="submit">Oddaj</button>
        </form>
      )}
      {err && <p className="error">{err}</p>}
    </article>
  )
}
