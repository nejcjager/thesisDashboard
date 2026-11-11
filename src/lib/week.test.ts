import { describe, expect, it } from 'vitest'
import { addDays, isoWeekNumber, localDay, weekLabel, weekStart } from './week'
import { streaks } from './streaks'
import { hm } from './format'

describe('week', () => {
  it('finds Monday', () => {
    expect(weekStart('2026-11-11')).toBe('2026-11-09')
    expect(weekStart('2026-11-09')).toBe('2026-11-09')
    expect(weekStart('2026-11-15')).toBe('2026-11-09')
    expect(weekStart('2027-01-01')).toBe('2026-12-28')
  })
  it('uses Ljubljana calendar days', () => {
    expect(localDay(new Date('2026-11-15T23:30:00Z'))).toBe('2026-11-16')
    expect(localDay(new Date('2026-07-05T22:30:00Z'))).toBe('2026-07-06')
  })
  it('adds days across months and DST', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
  })
  it('labels weeks', () => {
    expect(weekLabel('2026-11-09')).toBe('9.–15. nov. 2026')
    expect(weekLabel('2026-10-26')).toBe('26. okt. – 1. nov. 2026')
  })
  it('computes ISO week numbers', () => {
    expect(isoWeekNumber('2026-11-11')).toBe(46)
    expect(isoWeekNumber('2027-01-01')).toBe(53)
  })
})

describe('streaks', () => {
  it('counts current and best', () => {
    const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-08', '2026-11-09', '2026-11-10']
    expect(streaks(days, '2026-11-11')).toEqual({ current: 3, best: 3 })
    expect(streaks(days, '2026-11-10')).toEqual({ current: 3, best: 3 })
    expect(streaks(days, '2026-11-12')).toEqual({ current: 0, best: 3 })
    expect(streaks([], '2026-11-12')).toEqual({ current: 0, best: 0 })
  })
})

describe('format', () => {
  it('formats durations', () => {
    expect(hm(0)).toBe('0 min')
    expect(hm(3600)).toBe('1 h')
    expect(hm(5400)).toBe('1 h 30 min')
  })
})
