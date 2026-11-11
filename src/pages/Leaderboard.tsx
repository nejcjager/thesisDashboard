import { useEffect, useMemo, useState } from 'react'
import { Standings } from '../components/Standings'
import { api } from '../lib/api'
import { useApp, useLive } from '../lib/context'
import { hm } from '../lib/format'
import { addDays, isoWeekNumber, localDay, weekLabel, weekStart } from '../lib/week'
import { Name } from '../components/Name'

export function Leaderboard() {
  const { settings } = useApp()
  const thisWeek = weekStart(localDay())
  const [week, setWeek] = useState(thisWeek)

  useEffect(() => { void api.finalize() }, [])

  const daily = useLive(() => api.dailyTotals(), ['sessions'])
  const all = daily.data ?? []

  const firstWeek = useMemo(
    () => all.reduce((min, d) => (weekStart(d.day) < min ? weekStart(d.day) : min), thisWeek),
    [all, thisWeek],
  )
  const final = addDays(week, 7) <= localDay()
  const weekDaily = all.filter(d => weekStart(d.day) === week)
  const total = weekDaily.reduce((a, d) => a + d.seconds, 0)

  const mvpDay = weekDaily.reduce<typeof weekDaily[number] | null>((best, d) => (!best || d.seconds > best.seconds ? d : best), null)

  return (
    <div>
      <nav className="week-nav">
        <button onClick={() => setWeek(addDays(week, -7))} disabled={week <= firstWeek} aria-label="Prejšnji teden">←</button>
        <h1>
          {week === thisWeek ? 'Ta teden' : `${isoWeekNumber(week)}. teden`}
          <small>{weekLabel(week)}</small>
        </h1>
        <button onClick={() => setWeek(addDays(week, 7))} disabled={week >= thisWeek} aria-label="Naslednji teden">→</button>
      </nav>

      <Standings week={week} daily={all} final={final} />

      <section className="report">
        <p>
          {final ? 'Teden je zaključen.' : 'Teden še teče, lestvica se lahko spremeni do nedelje polnoči.'}
          {' '}Skupaj: <strong>{hm(total)}</strong>.
        </p>
        {mvpDay && (
          <p>Najdaljši dan: <Name id={mvpDay.user_id} /> z {hm(mvpDay.seconds)} ({new Date(mvpDay.day).toLocaleDateString('sl-SI', { weekday: 'long', timeZone: 'UTC' })}).</p>
        )}
        {settings && (
          <dl className="stakes-list">
            <dt>Nagrada</dt><dd>{settings.prize_text}</dd>
            <dt>Kazen</dt><dd>{settings.penalty_text}</dd>
          </dl>
        )}
      </section>
    </div>
  )
}
