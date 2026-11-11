import { addDays } from './week'

/** Streaks of consecutive calendar days with at least one counted session. */
export function streaks(days: string[], today: string): { current: number; best: number } {
  const set = new Set(days)
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of [...set].sort()) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  // Today isn't over yet, so a streak that ended yesterday is still current.
  let cursor = set.has(today) ? today : addDays(today, -1)
  let current = 0
  while (set.has(cursor)) {
    current++
    cursor = addDays(cursor, -1)
  }
  return { current, best }
}
