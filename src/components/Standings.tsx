import { useMemo } from 'react'
import { useApp } from '../lib/context'
import { hm, hoursDecimal } from '../lib/format'
import { dayShort, weekDays } from '../lib/week'
import type { DailyTotal, Session } from '../lib/types'
import { Name } from './Name'

interface Row {
  userId: string
  seconds: number
  sessions: number
  place: number
  winner: boolean
  loser: boolean
  running: boolean
  perDay: number[]
}

/** Ranking for one week, computed from daily totals so the current week works before anyone logs. */
export function Standings({ week, daily, active, final, compact }: {
  week: string
  daily: DailyTotal[]
  active?: Session[]
  final: boolean
  compact?: boolean
}) {
  const { profiles } = useApp()
  const days = weekDays(week)
  const weekEnd = days[6]

  const rows = useMemo<Row[]>(() => {
    const members = profiles.filter(p => p.created_at.slice(0, 10) <= weekEnd)
    const base = members.map(p => {
      const perDay = days.map(d => daily.find(t => t.user_id === p.id && t.day === d)?.seconds ?? 0)
      const sessions = daily.filter(t => t.user_id === p.id && days.includes(t.day)).reduce((a, t) => a + t.sessions, 0)
      return { userId: p.id, perDay, seconds: perDay.reduce((a, b) => a + b, 0), sessions }
    })
    const sorted = [...base].sort((a, b) => b.seconds - a.seconds)
    const max = sorted[0]?.seconds ?? 0
    const min = sorted[sorted.length - 1]?.seconds ?? 0
    return sorted.map(r => ({
      ...r,
      place: sorted.findIndex(x => x.seconds === r.seconds) + 1,
      winner: max > 0 && r.seconds === max,
      loser: sorted.length > 1 && min < max && r.seconds === min,
      running: Boolean(active?.some(s => s.user_id === r.userId)),
    }))
  }, [profiles, daily, active, week])

  const peak = Math.max(1, ...rows.flatMap(r => r.perDay))

  if (!rows.length) return <p className="muted">Še ni udeležencev.</p>

  return (
    <div className="table-wrap">
    <table className="standings">
      <thead>
        <tr>
          <th className="num">#</th>
          <th>Ime</th>
          {!compact && days.map((d, i) => <th key={d} className="day">{dayShort[i]}</th>)}
          <th className="num">Ure</th>
          {!compact && <th className="num">Sej</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.userId} className={r.loser && final ? 'loser' : undefined}>
            <td className="num">{r.place}.</td>
            <td>
              <Name id={r.userId} />
              {r.running && <span className="tag live">piše</span>}
              {r.winner && <span className={final ? 'stamp' : 'tag'}>{final ? 'zmagovalec' : 'vodi'}</span>}
              {r.loser && !final && <span className="tag">zadnji</span>}
            </td>
            {!compact && r.perDay.map((s, i) => (
              <td key={i} className="day" title={hm(s)}>
                <span className="bar" style={{ height: `${Math.round((s / peak) * 100)}%` }} />
              </td>
            ))}
            <td className="num strong">{hoursDecimal(r.seconds)}</td>
            {!compact && <td className="num">{r.sessions}</td>}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  )
}
