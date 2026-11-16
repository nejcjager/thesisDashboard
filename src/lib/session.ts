import type { Session } from './types'

/** Working seconds of an open session: frozen while paused, finished pauses excluded. */
export function workedSeconds(s: Pick<Session, 'started_at' | 'paused_at' | 'paused_seconds'>, serverNow: number) {
  const until = s.paused_at ? Date.parse(s.paused_at) : serverNow
  return Math.max(0, (until - Date.parse(s.started_at)) / 1000 - s.paused_seconds)
}
