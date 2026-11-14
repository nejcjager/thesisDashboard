import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { errorText } from '../lib/errors'
import { useT } from '../lib/i18n'
import { LangSwitch } from '../components/LangSwitch'

export function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const { t } = useT()

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
      <div className="login-card">
        <div className="login-top">
          <span className="brand-dot big" aria-hidden="true" />
          <LangSwitch />
        </div>
        <h1>{t.app.title}</h1>
        <p className="lede">{t.login.lede}</p>
        {sent ? (
          <p>{t.login.sent[0]}<strong>{email}</strong>{t.login.sent[1]}</p>
        ) : (
          <form className="stack" onSubmit={submit}>
            <label className="field">
              {t.login.email}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </label>
            <button className="big-btn" disabled={busy}>{busy ? t.login.sending : t.login.send}</button>
            {err && <p className="error">{err}</p>}
          </form>
        )}
      </div>
    </main>
  )
}
