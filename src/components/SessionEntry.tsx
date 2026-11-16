import { useState } from 'react'
import { api } from '../lib/api'
import { useApp } from '../lib/context'
import { errorText } from '../lib/errors'
import { dateOf, hm, timeOf } from '../lib/format'
import type { SessionWithSocial } from '../lib/types'
import { Avatar } from './Avatar'
import { useT } from '../lib/i18n'

const EMOJI = ['👏', '🔥', '☕', '🤔']

const statusTag: Record<string, string> = { active: 'live', paused: 'last', voided: 'last' }

export function SessionEntry({ s, onChange }: { s: SessionWithSocial; onChange?: () => void }) {
  const { me, byId } = useApp()
  const { t } = useT()
  const [doubting, setDoubting] = useState(false)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const mine = me?.id === s.user_id
  const myDoubt = s.doubts.find(d => d.user_id === me?.id)
  const active = s.status === 'active'
  const tagKey = active && s.paused_at ? 'paused' : s.status

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
      <div className="eh">
        <Avatar id={s.user_id} live={active && !s.paused_at} />
        <div className="who">
          <strong>{byId.get(s.user_id)?.display_name ?? '?'}</strong>
          <span>{dateOf(s.started_at)}, {active ? t.common.since(timeOf(s.started_at)) : `${timeOf(s.started_at)}${s.ended_at ? `–${timeOf(s.ended_at)}` : ''}`}</span>
        </div>
        {s.status !== 'completed' && <span className={`tag ${statusTag[tagKey] ?? ''}`}>{t.entry.status[tagKey]}</span>}
        {s.credited_seconds != null && <span className="dur">{hm(s.credited_seconds)}</span>}
      </div>

      {s.note ? <p className="note">{s.note}</p> : !active && <p className="note faint">{t.entry.noNote}</p>}
      {s.status === 'voided' && s.void_reason && <p className="meta">{t.entry.reason(s.void_reason)}</p>}
      {s.image_path && (
        <a href={api.proofUrl(s.image_path)} target="_blank" rel="noreferrer" className="proof">
          <img src={api.proofUrl(s.image_path)} alt={t.entry.proofAlt} loading="lazy" />
        </a>
      )}
      {!active && <p className="meta">{t.entry.confirmed(s.pings_answered)}</p>}

      {s.doubts.length > 0 && (
        <ul className="doubts">
          {s.doubts.map(d => (
            <li key={d.user_id}><strong>{t.entry.doubts(byId.get(d.user_id)?.display_name ?? '?')}</strong> {d.reason}</li>
          ))}
        </ul>
      )}

      {!active && (
        <div className="ef">
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
            ? <button className="linkbtn" onClick={() => run(() => api.withdrawDoubt(s.id, me!.id))}>{t.entry.withdrawDoubt}</button>
            : <button className="linkbtn" onClick={() => setDoubting(v => !v)}>{t.entry.doubt}</button>)}
        </div>
      )}

      {doubting && !myDoubt && (
        <form
          className="inline"
          onSubmit={e => {
            e.preventDefault()
            run(async () => { await api.doubt(s.id, reason.trim()); setDoubting(false); setReason('') })
          }}
        >
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder={t.entry.whyDoubt} aria-label={t.entry.whyDoubt} minLength={3} required autoFocus />
          <button type="submit" className="btn">{t.entry.submit}</button>
        </form>
      )}
      {err && <p className="error">{err}</p>}
    </article>
  )
}
