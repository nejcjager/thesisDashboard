import { describe, expect, it } from 'vitest'
import { errorText } from './errors'

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
