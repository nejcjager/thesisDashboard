import { api } from '../lib/api'
import { useApp, useLive } from '../lib/context'
import { hm, hoursDecimal } from '../lib/format'
import { streaks } from '../lib/streaks'
import { localDay } from '../lib/week'
import { Name } from '../components/Name'

export function Stats() {
  const { profiles } = useApp()
  const stats = useLive(() => api.userStats(), ['sessions'])
  const daily = useLive(() => api.dailyTotals(), ['sessions'])
  const today = localDay()

  const rows = profiles.map(p => {
    const s = stats.data?.find(x => x.user_id === p.id)
    const days = (daily.data ?? []).filter(d => d.user_id === p.id).map(d => d.day)
    const st = streaks(days, today)
    const total = s?.total_seconds ?? 0
    return { p, s, st, total, avg: s?.total_sessions ? total / s.total_sessions : 0, days: days.length }
  }).sort((a, b) => b.total - a.total)

  return (
    <div>
      <h1>Statistika</h1>
      <div className="table-wrap">
      <table className="standings">
        <thead>
          <tr>
            <th>Ime</th>
            <th className="num">Skupaj (h)</th>
            <th className="num">Sej</th>
            <th className="num">Povp. seja</th>
            <th className="num">Dni dela</th>
            <th className="num">Niz</th>
            <th className="num">Najdaljši niz</th>
            <th className="num">Zmage</th>
            <th className="num">Porazi</th>
            <th className="num">Razveljavljeno</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.p.id}>
              <td><Name id={r.p.id} /></td>
              <td className="num strong">{hoursDecimal(r.total)}</td>
              <td className="num">{r.s?.total_sessions ?? 0}</td>
              <td className="num">{hm(r.avg)}</td>
              <td className="num">{r.days}</td>
              <td className="num">{r.st.current} d</td>
              <td className="num">{r.st.best} d</td>
              <td className="num">{r.s?.weeks_won ?? 0}</td>
              <td className="num">{r.s?.weeks_lost ?? 0}</td>
              <td className="num">{r.s?.voided_sessions ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <p className="muted small">Niz je število zaporednih dni z vsaj eno sejo. Zmage in porazi se štejejo samo za zaključene tedne.</p>
    </div>
  )
}
