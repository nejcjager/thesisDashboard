import { useState } from 'react'
import { SessionEntry } from '../components/SessionEntry'
import { api } from '../lib/api'
import { useApp, useLive } from '../lib/context'

export function Log() {
  const { profiles } = useApp()
  const [who, setWho] = useState('')
  const [limit, setLimit] = useState(30)
  const list = useLive(() => api.sessions({ userId: who || undefined, limit }), ['sessions', 'reactions', 'doubts'], [who, limit])

  return (
    <div>
      <div className="heading-row">
        <h1>Dnevnik</h1>
        <select value={who} onChange={e => setWho(e.target.value)} aria-label="Oseba">
          <option value="">vsi</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
        </select>
      </div>
      {list.error && <p className="error">{list.error}</p>}
      {(list.data ?? []).map(s => <SessionEntry key={s.id} s={s} onChange={list.reload} />)}
      {list.data?.length === 0 && <p className="muted">Ni vpisov.</p>}
      {list.data && list.data.length >= limit && (
        <button onClick={() => setLimit(l => l + 30)}>Naloži starejše</button>
      )}
    </div>
  )
}
