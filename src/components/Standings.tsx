import { useMemo } from 'react'
import { useApp } from '../lib/context'
import { personColor } from '../lib/colors'
import { hoursDecimal } from '../lib/format'
import { weekDays } from '../lib/week'
import type { DailyTotal } from '../lib/types'
import { Avatar } from './Avatar'
import { Confetti } from './Confetti'

export interface Row {
  userId: string
  seconds: number
  sessions: number
  place: number
  winner: boolean
  loser: boolean
  perDay: number[]
}

/** Ranking for one week, computed from daily totals so the current week works before anyone logs. */
export function useWeekRows(week: string, daily: DailyTotal[]): Row[] {
  const { profiles } = useApp()
  return useMemo<Row[]>(() => {
    const days = weekDays(week)
    const members = profiles.filter(p => p.created_at.slice(0, 10) <= days[6])
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
    }))
  }, [profiles, daily, week])
}

export function Standings({ rows, live, final, streaks }: {
  rows: Row[]
  live: Set<string>
  final: boolean
  /** Current streak per user; only passed for the running week. */
  streaks?: Map<string, number>
}) {
  const { me, byId } = useApp()
  if (!rows.length) return <p className="empty">Še ni udeležencev.</p>

  const top = rows[0].seconds || 1
  const iWon = final && rows.some(r => r.winner && r.userId === me?.id)

  const badges = (r: Row) => (
    <>
      {live.has(r.userId) && <span className="tag live">piše</span>}
      {r.winner && (final ? <span className="tag win">zmagovalec</span> : <span className="tag lead">vodi</span>)}
      {r.loser && <span className="tag last">{final ? 'kazen' : 'zadnji'}</span>}
    </>
  )
  const streak = (r: Row) => {
    const n = streaks?.get(r.userId) ?? 0
    return n > 0 ? <span className="streak">🔥 {n} {n === 1 ? 'dan' : n === 2 ? 'dneva' : n < 5 ? 'dnevi' : 'dni'}</span> : null
  }
  const name = (r: Row) => (
    <>
      {byId.get(r.userId)?.display_name ?? '?'}
      {r.userId === me?.id && <span className="tag">ti</span>}
    </>
  )

  const pod = (r: Row | undefined, slot: 1 | 2 | 3) => r ? (
    <div className={`pod p${slot}`}>
      <Avatar id={r.userId} size={slot === 1 ? 'xl' : 'lg'} live={live.has(r.userId)} />
      <div className="pod-name">{name(r)}</div>
      <div className="pod-hrs">{hoursDecimal(r.seconds)}<small> h</small></div>
      <div className="badges">{badges(r)}</div>
      {streak(r)}
      <div className="block">{r.place}</div>
    </div>
  ) : <div />

  return (
    <>
      <section className="podium" aria-label="Zmagovalni oder">
        {iWon && <Confetti />}
        {pod(rows[1], 2)}{pod(rows[0], 1)}{pod(rows[2], 3)}
      </section>

      {rows.length > 3 && (
        <section className="rest" aria-label="Ostali">
          {rows.slice(3).map(r => (
            <div key={r.userId} className={`rrow${r.loser && final ? ' loser' : ''}`}>
              <span className="pl">{r.place}.</span>
              <Avatar id={r.userId} live={live.has(r.userId)} />
              <div className="mid">
                <div className="n">{name(r)} {badges(r)} {streak(r)}</div>
                <div className="bar"><i style={{ width: `${Math.round((r.seconds / top) * 100)}%`, background: personColor(byId.get(r.userId)?.color) }} /></div>
              </div>
              <span className="h">{hoursDecimal(r.seconds)} h</span>
            </div>
          ))}
        </section>
      )}
    </>
  )
}
