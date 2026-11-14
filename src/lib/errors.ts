import { dict } from './i18n/core'

/** Maps an RPC error code (or a Supabase auth error) to a message in the active language. */
export function errorText(err: unknown): string {
  let raw = ''
  if (err instanceof Error) raw = err.message
  else if (err && typeof err === 'object' && 'message' in err) raw = String((err as { message: unknown }).message)
  else raw = String(err)

  const t = dict()
  for (const [code, text] of Object.entries(t.errors)) {
    if (raw.includes(code)) return text
  }
  if (raw.includes('Database error saving new user')) return t.errors.EMAIL_NOT_ALLOWED
  // Per-address cooldown between login links.
  const cooldown = raw.match(/after (\d+) seconds?/)
  if (cooldown) return t.errorMisc.cooldown(cooldown[1])
  // Project-wide hourly cap on outgoing emails.
  if (raw.toLowerCase().includes('rate limit')) return t.errorMisc.rateLimit
  return raw || t.errorMisc.generic
}
