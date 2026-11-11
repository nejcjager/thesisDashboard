import { TimerPanel } from '../components/TimerPanel'
import { Avatar } from '../components/Avatar'
import { api } from '../lib/api'
import { useApp, useLive } from '../lib/context'
import { useTimer } from '../lib/timer'
import { hm, timeOf } from '../lib/format'
import { localDay, weekStart } from '../lib/week'

export function Today() {
  const { me, settings, byId } = useApp()
  const t = useTimer()
  const today = localDay()
  const week = weekStart(today)
  const daily = useLive(() => api.dailyTotals(week), ['sessions'], [week])
  const active = useLive(() => api.activeSessions(), ['sessions'])

  // daily_totals only counts closed sessions, so add the one that's running now.
  const running = t.session?.status === 'active' ? Math.max(0, (t.serverNow - Date.parse(t.session.started_at)) / 1000) : 0
  const mine = (daily.data ?? []).filter(d => d.user_id === me?.id)
  const todaySec = mine.filter(d => d.day === today).reduce((a, d) => a + d.seconds, 0) + running
  const weekSec = mine.reduce((a, d) => a + d.seconds, 0) + running
  const others = (active.data ?? []).filter(s => s.user_id !== me?.id)

  return (
    <div className="timer-view">
      <TimerPanel />

      <div className="below">
        <div className="totals">
          <div className="total"><div className="k">Danes</div><div className="v">{hm(todaySec)}</div></div>
          <div className="total"><div className="k">Ta teden</div><div className="v">{hm(weekSec)}</div></div>
        </div>

        <div className="working">
          <span className="k">Zdaj delajo</span>
          {others.length === 0 && t.phase !== 'running' && t.phase !== 'due'
            ? <span className="muted-on">Nihče. Bodi prvi.</span>
            : (
              <div className="people">
                {others.map(s => (
                  <span key={s.id} className="p">
                    <Avatar id={s.user_id} size="sm" live />
                    {byId.get(s.user_id)?.display_name ?? '?'} <span className="t">od {timeOf(s.started_at)}</span>
                  </span>
                ))}
                {(t.phase === 'running' || t.phase === 'due') && me && (
                  <span className="p"><Avatar id={me.id} size="sm" live />Ti</span>
                )}
              </div>
            )}
        </div>

        {settings && (
          <p className="rules">
            Med delom te stran vsakih {settings.ping_min_minutes}–{settings.ping_max_minutes} min vpraša, ali še delaš.
            Na odgovor imaš {settings.ping_window_minutes} min. Šteje samo čas do zadnje potrditve.
          </p>
        )}
      </div>
    </div>
  )
}
