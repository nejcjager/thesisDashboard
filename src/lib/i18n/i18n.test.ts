import { describe, expect, it } from 'vitest'
import { sl } from './sl'
import { en } from './en'

describe('plurals', () => {
  it('uses all four Slovenian forms', () => {
    expect([1, 2, 3, 5, 101].map(sl.standings.streak)).toEqual(['🔥 1 dan', '🔥 2 dneva', '🔥 3 dnevi', '🔥 5 dni', '🔥 101 dan'])
    expect([1, 2, 4, 0].map(sl.timer.checks)).toEqual(['1 preverjanje', '2 preverjanji', '4 preverjanja', '0 preverjanj'])
  })

  it('uses singular and plural in English', () => {
    expect([1, 2, 0].map(en.standings.streak)).toEqual(['🔥 1 day', '🔥 2 days', '🔥 0 days'])
    expect(en.entry.confirmed(1)).toBe('✔ 1 confirmed check-in')
  })
})

describe('dictionaries', () => {
  it('cover the same error codes', () => {
    expect(Object.keys(en.errors).sort()).toEqual(Object.keys(sl.errors).sort())
  })
})
