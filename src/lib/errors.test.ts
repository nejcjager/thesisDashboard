import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { errorText } from './errors'
import { setLang } from './i18n/core'

describe('errorText', () => {
  it('shows the remaining seconds for the per-address cooldown', () => {
    const msg = errorText({ message: 'For security purposes, you can only request this after 47 seconds.' })
    expect(msg).toContain('47 s')
  })

  it('explains the hourly email cap', () => {
    expect(errorText({ message: 'email rate limit exceeded' })).toContain('urna omejitev')
  })

  it('maps known RPC codes', () => {
    expect(errorText(new Error('NOTE_REQUIRED'))).toBe('Napiši vsaj kratek zapis o tem, kaj si naredil.')
  })

  it('passes unknown messages through', () => {
    expect(errorText(new Error('something odd'))).toBe('something odd')
  })
})

describe('errorText in English', () => {
  beforeEach(() => setLang('en'))
  afterEach(() => setLang('sl'))

  it('maps RPC codes to English', () => {
    expect(errorText(new Error('NOTE_REQUIRED'))).toBe('Write at least a short note about what you did.')
  })

  it('keeps the cooldown seconds', () => {
    expect(errorText({ message: 'you can only request this after 47 seconds.' })).toBe('You already requested a link. Wait 47 s and try again.')
  })
})
