import { describe, expect, it } from 'vitest'
import { workedSeconds } from './session'

const start = '2026-11-16T10:00:00Z'
const at = (iso: string) => Date.parse(iso)

describe('workedSeconds', () => {
  it('counts from the start while running', () => {
    expect(workedSeconds({ started_at: start, paused_at: null, paused_seconds: 0 }, at('2026-11-16T10:30:00Z'))).toBe(1800)
  })

  it('subtracts finished pauses', () => {
    expect(workedSeconds({ started_at: start, paused_at: null, paused_seconds: 600 }, at('2026-11-16T10:30:00Z'))).toBe(1200)
  })

  it('freezes at the pause', () => {
    const s = { started_at: start, paused_at: '2026-11-16T10:20:00Z', paused_seconds: 300 }
    expect(workedSeconds(s, at('2026-11-16T10:25:00Z'))).toBe(900)
    expect(workedSeconds(s, at('2026-11-16T11:00:00Z'))).toBe(900)
  })

  it('never goes negative', () => {
    expect(workedSeconds({ started_at: start, paused_at: null, paused_seconds: 0 }, at('2026-11-16T09:59:00Z'))).toBe(0)
  })
})
