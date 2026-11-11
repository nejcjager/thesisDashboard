import { describe, expect, it } from 'vitest'
import { onColor, PALETTE, personColor } from './colors'

describe('personColor', () => {
  it('maps the old ink palette to the bright one', () => {
    expect(personColor('#1d1b16')).toBe('#5c6378')
    expect(personColor('#B3261E')).toBe('#ff5a4e')
  })
  it('keeps colors that are already bright', () => {
    for (const c of PALETTE) expect(personColor(c)).toBe(c)
  })
  it('falls back when empty', () => {
    expect(personColor(null)).toBe('#5c6378')
  })
})

describe('onColor', () => {
  it('uses white on saturated mid tones', () => {
    expect(onColor('#ff5a4e')).toBe('#ffffff')
    expect(onColor('#3a7bff')).toBe('#ffffff')
    expect(onColor('#5c6378')).toBe('#ffffff')
  })
  it('uses dark text on light colors', () => {
    expect(onColor('#ff9419')).not.toBe('#ffffff')
    expect(onColor('#ffffff')).not.toBe('#ffffff')
  })
})
