import { useEffect, useMemo, useState } from 'react'
import { Standings, useWeekRows } from '../components/Standings'
import { WeekHeatmap } from '../components/WeekHeatmap'
import { SessionEntry } from '../components/SessionEntry'
import { api } from '../lib/api'
import { useApp, useLive } from '../lib/context'
import { hoursDecimal } from '../lib/format'
import { streaks } from '../lib/streaks'
import { addDays, isoWeekNumber, localDay, weekLabel, weekStart } from '../lib/week'

export function Leaderboard() {
  const { settings, profiles } = useApp()
  const today = localDay()
  const thisWeek = weekStart(today)
  const [week, setWeek] = useState(thisWeek)
  const [who, setWho] = useState('')
  const [limit, setLimit] = useState(30)

  useEffect(() => { void api.finalize() }, [])

  const daily = useLive(() => api.dailyTotals(), ['sessions'])
  const active = useLive(() => api.activeSessions(), ['sessions'])
  const feed = useLive(() => api.sessions({ userId: who || undefined, limit }), ['sessions', 'reactions', 'doubts'], [who, limit])
  const all = daily.data ?? []

  const firstWeek = useMemo(
    () => all.reduce((min, d) => (weekStart(d.day) < min ? weekStart(d.day) : min), thisWeek),
    [all, thisWeek],
  )
  const isCurrent = week === thisWeek
  const final = addDays(week, 7) <= today
  const rows = useWeekRows(week, all)
  const total = rows.reduce((a, r) => a + r.seconds, 0)
  const live = useMemo(() => new Set(isCurrent ? (active.data ?? []).map(s => s.user_id) : []), [active.data, isCurrent])
  const streakMap = useMemo(() => {
    if (!isCurrent) return undefined
    const m = new Map<string, number>()
    for (const p of profiles) m.set(p.id, streaks(all.filter(d => d.user_id === p.id).map(d => d.day), today).current)
    return m
  }, [all, profiles, today, isCurrent])

  return (
    <div className="board">
      <nav className="week-nav" aria-label="Teden">
        <button onClick={() => setWeek(addDays(week, -7))} disabled={week <= firstWeek} aria-label="Prejšnji teden">←</button>
        <h1>
          {isCurrent ? 'Ta teden' : `${isoWeekNumber(week)}. teden`}
          <small>{weekLabel(week)}</small>
        </h1>
        <button onClick={() => setWeek(addDays(week, 7))} disabled={isCurrent} aria-label="Naslednji teden">→</button>
      </nav>
      <p className="status-line">
        {final ? 'Teden je zaključen.' : 'Teden še teče do nedelje polnoči.'} Skupaj vsi: <b>{hoursDecimal(total)} h</b>
      </p>

      <Standings rows={rows} live={live} final={final} streaks={streakMap} />

      {settings && (settings.prize_text || settings.penalty_text) && (
        <section className="stakes">
          <div className="stake prize"><span className="k">🏆 Nagrada</span><span className="v">{settings.prize_text}</span></div>
          <div className="stake penalty"><span className="k">💸 Kazen</span><span className="v">{settings.penalty_text}</span></div>
        </section>
      )}

      <section>
        <div className="section-h"><h2>Po dnevih</h2><p>Temnejše polje pomeni več ur.</p></div>
        <WeekHeatmap week={week} rows={rows} today={today} />
      </section>

      <section>
        <div className="section-h">
          <h2>Aktivnost</h2>
          <select value={who} onChange={e => { setWho(e.target.value); setLimit(30) }} aria-label="Oseba">
            <option value="">Vsi</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </select>
        </div>
        <div className="feed">
          {feed.error && <p className="error">{feed.error}</p>}
          {(feed.data ?? []).map(s => <SessionEntry key={s.id} s={s} onChange={feed.reload} />)}
          {feed.data?.length === 0 && <p className="empty">Ni vpisov.</p>}
          {feed.data && feed.data.length >= limit && (
            <button className="btn more" onClick={() => setLimit(l => l + 30)}>Naloži starejše</button>
          )}
        </div>
      </section>
    </div>
  )
}
