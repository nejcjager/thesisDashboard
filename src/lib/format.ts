import { TZ } from './week'

export function hm(seconds: number): string {
  const total = Math.max(0, Math.round(seconds / 60))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export function hoursDecimal(seconds: number): string {
  return (seconds / 3600).toLocaleString('sl-SI', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const timeFmt = new Intl.DateTimeFormat('sl-SI', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const dateFmt = new Intl.DateTimeFormat('sl-SI', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })

export const timeOf = (iso: string) => timeFmt.format(new Date(iso))
export const dateOf = (iso: string) => dateFmt.format(new Date(iso))
