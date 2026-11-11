const messages: Record<string, string> = {
  EMAIL_NOT_ALLOWED: 'Ta e-poštni naslov ni na seznamu. Prosi skrbnika, da te doda.',
  ALREADY_ACTIVE: 'Seja že teče.',
  SESSION_CLOSED: 'Seja je že zaključena.',
  PING_NOT_DUE: 'Preverjanje še ni na vrsti.',
  NOTE_REQUIRED: 'Napiši vsaj kratek zapis o tem, kaj si naredil.',
  SESSION_LOCKED: 'Seja je zaklenjena in je ni več mogoče spreminjati.',
  NOT_ADMIN: 'Za to potrebuješ skrbniške pravice.',
  NOT_FOUND: 'Seje ni bilo mogoče najti.',
  BAD_IMAGE_PATH: 'Neveljavna slika.',
}

export function errorText(err: unknown): string {
  let raw = ''
  if (err instanceof Error) raw = err.message
  else if (err && typeof err === 'object' && 'message' in err) raw = String((err as { message: unknown }).message)
  else raw = String(err)

  for (const code of Object.keys(messages)) {
    if (raw.includes(code)) return messages[code]
  }
  if (raw.includes('Database error saving new user')) return messages.EMAIL_NOT_ALLOWED
  // Per-address cooldown between login links.
  const cooldown = raw.match(/after (\d+) seconds?/)
  if (cooldown) return `Povezavo si že zahteval. Počakaj še ${cooldown[1]} s in poskusi znova.`
  // Project-wide hourly cap on outgoing emails.
  if (raw.toLowerCase().includes('rate limit')) {
    return 'Dosežena je urna omejitev pošiljanja e-pošte. Poskusi znova čez približno eno uro ali obvesti skrbnika.'
  }
  return raw || 'Nekaj je šlo narobe.'
}
