import { useApp } from '../lib/context'
import { personColor } from '../lib/colors'
import { hm, hoursDecimal } from '../lib/format'
import { weekDays } from '../lib/week'
import { useT } from '../lib/i18n'
import type { Row } from './Standings'

/** People × days grid; a cell gets stronger in the person's color the more hours it holds. */
export function WeekHeatmap({ week, rows, today }: { week: string; rows: Row[]; today: string }) {
  const { byId } = useApp()
  const { t } = useT()
  const { dayShort } = t.dates
  const days = weekDays(week)
  const peak = Math.max(1, ...rows.flatMap(r => r.perDay))

  return (
    <div className="heat-wrap">
      <table className="heat">
        <thead>
          <tr>
            <th className="who">{t.heatmap.who}</th>
            {days.map((d, i) => <th key={d} className={d === today ? 'today' : undefined}>{dayShort[i]}</th>)}
            <th>{t.heatmap.total}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const p = byId.get(r.userId)
            const c = personColor(p?.color)
            return (
              <tr key={r.userId}>
                <td className="nm">{p?.display_name ?? '?'}</td>
                {r.perDay.map((s, i) => {
                  if (days[i] > today) return <td key={i} className="future" aria-label={t.heatmap.notYet} />
                  const a = s ? 0.18 + 0.82 * (s / peak) : 0
                  return (
                    <td
                      key={i}
                      className={`cell${a > 0.6 ? ' hot' : ''}`}
                      style={{ background: `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, var(--surface-2))` }}
                      title={`${p?.display_name ?? '?'}, ${dayShort[i]}: ${hm(s)}`}
                    >
                      {s ? hoursDecimal(s) : '·'}
                    </td>
                  )
                })}
                <td className="sum">{hoursDecimal(r.seconds)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
