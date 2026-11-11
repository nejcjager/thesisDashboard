import { Link } from 'react-router-dom'
import { TimerPanel } from '../components/TimerPanel'
import { Standings } from '../components/Standings'
import { SessionEntry } from '../components/SessionEntry'
import { api } from '../lib/api'
import { useApp, useLive } from '../lib/context'
import { localDay, weekLabel, weekStart } from '../lib/week'

export function Today() {
  const { settings } = useApp()
  const week = weekStart(localDay())
  const daily = useLive(() => api.dailyTotals(week), ['sessions'], [week])
  const recent = useLive(() => api.sessions({ limit: 6 }), ['sessions', 'reactions', 'doubts'])
  const active = (recent.data ?? []).filter(s => s.status === 'active')

  return (
    <div className="today">
      <TimerPanel />

      <section>
        <h2>Ta teden <small>{weekLabel(week)}</small></h2>
        <Standings week={week} daily={daily.data ?? []} active={active} final={false} compact />
        {settings?.penalty_text && <p className="stakes">Kazen: {settings.penalty_text}</p>}
        <p><Link to="/lestvica">Celotna lestvica →</Link></p>
      </section>

      <section>
        <h2>Zadnji vpisi</h2>
        {(recent.data ?? []).map(s => <SessionEntry key={s.id} s={s} onChange={recent.reload} />)}
        {recent.data?.length === 0 && <p className="muted">Še nihče ni začel. Bodi prvi.</p>}
        <p><Link to="/dnevnik">Ves dnevnik →</Link></p>
      </section>
    </div>
  )
}
