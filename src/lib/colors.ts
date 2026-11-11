/** Person colors a user can pick on the profile page. Each one doubles as that user's UI accent. */
export const PALETTE = ['#ff5a4e', '#3a7bff', '#14a868', '#ff9419', '#9b5de5', '#00a8b5', '#f15bb5', '#5c6378']

// The first design used dark ink colors, and profiles.color still defaults to '#1d1b16'.
// Map those to the bright palette by position instead of migrating the column.
const LEGACY: Record<string, string> = {
  '#1d1b16': '#5c6378',
  '#b3261e': '#ff5a4e',
  '#1f4e79': '#3a7bff',
  '#2e6b3a': '#14a868',
  '#7a4b0f': '#ff9419',
  '#5b2a6e': '#9b5de5',
  '#0f6b6b': '#00a8b5',
  '#8a6d00': '#f15bb5',
}

export function personColor(c: string | null | undefined): string {
  if (!c) return PALETTE[PALETTE.length - 1]
  return LEGACY[c.toLowerCase()] ?? c
}

const DARK_TEXT = '#1c1a29'

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return 0
  const n = parseInt(m[1], 16)
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
}

/** Text color for a label sitting on `bg`: white while it keeps 3:1 contrast (bold, large text), otherwise dark. */
export function onColor(bg: string): string {
  return 1.05 / (luminance(bg) + 0.05) >= 3 ? '#ffffff' : DARK_TEXT
}
