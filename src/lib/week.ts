export const TZ = 'Europe/Ljubljana'

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

/** Calendar day (YYYY-MM-DD) of an instant, in Ljubljana time. */
export function localDay(d: Date | string = new Date()): string {
  return dayFmt.format(typeof d === 'string' ? new Date(d) : d)
}

function toUTC(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function addDays(day: string, n: number): string {
  const d = toUTC(day)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Monday of the week containing `day`. */
export function weekStart(day: string): string {
  const dow = (toUTC(day).getUTCDay() + 6) % 7
  return addDays(day, -dow)
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function isoWeekNumber(day: string): number {
  const thursday = toUTC(addDays(weekStart(day), 3))
  const jan1 = Date.UTC(thursday.getUTCFullYear(), 0, 1)
  return Math.floor((thursday.getTime() - jan1) / 86400000 / 7) + 1
}

const months = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'avg.', 'sep.', 'okt.', 'nov.', 'dec.']

/** "9.–15. nov. 2026", or "26. okt. – 1. nov. 2026" across months. */
export function weekLabel(start: string): string {
  const end = addDays(start, 6)
  const [y1, m1, d1] = start.split('-').map(Number)
  const [y2, m2, d2] = end.split('-').map(Number)
  if (y1 !== y2) return `${d1}. ${months[m1 - 1]} ${y1} – ${d2}. ${months[m2 - 1]} ${y2}`
  if (m1 !== m2) return `${d1}. ${months[m1 - 1]} – ${d2}. ${months[m2 - 1]} ${y2}`
  return `${d1}.–${d2}. ${months[m2 - 1]} ${y2}`
}

export const dayShort = ['pon', 'tor', 'sre', 'čet', 'pet', 'sob', 'ned']
