import { TZ } from './week'
import { locale } from './i18n/core'

export function hm(seconds: number): string {
  const total = Math.max(0, Math.round(seconds / 60))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export function hoursDecimal(seconds: number): string {
  return (seconds / 3600).toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const options = {
  time: { timeZone: TZ, hour: '2-digit', minute: '2-digit' },
  date: { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' },
} satisfies Record<string, Intl.DateTimeFormatOptions>

// Formatters are costly to build, so keep one per kind and locale.
const cache = new Map<string, Intl.DateTimeFormat>()
function formatter(kind: keyof typeof options) {
  const key = `${kind}:${locale()}`
  let f = cache.get(key)
  if (!f) cache.set(key, f = new Intl.DateTimeFormat(locale(), options[kind]))
  return f
}

export const timeOf = (iso: string) => formatter('time').format(new Date(iso))
export const dateOf = (iso: string) => formatter('date').format(new Date(iso))
