import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { errorText } from '../lib/errors'

export function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const redirect = window.location.origin + window.location.pathname
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: redirect } })
    setBusy(false)
    if (error) setErr(errorText(error))
    else setSent(true)
  }

  return (
    <main className="login">
      <h1>Dnevnik diplome</h1>
      <p className="lede">Kdo je ta teden res pisal.</p>
      {sent ? (
        <p>Povezava za prijavo je poslana na <strong>{email}</strong>. Odpri jo v tem brskalniku.</p>
      ) : (
        <form onSubmit={submit}>
          <label>
            E-pošta
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </label>
          <button className="primary" disabled={busy}>{busy ? 'Pošiljam …' : 'Pošlji povezavo'}</button>
          {err && <p className="error">{err}</p>}
        </form>
      )}
    </main>
  )
}
