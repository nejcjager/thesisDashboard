import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useApp } from '../lib/context'
import { errorText } from '../lib/errors'
import { supabase } from '../lib/supabase'

const COLORS = ['#1d1b16', '#b3261e', '#1f4e79', '#2e6b3a', '#7a4b0f', '#5b2a6e', '#0f6b6b', '#8a6d00']

export function Profile() {
  const { me, reload } = useApp()
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (me) { setName(me.display_name); setColor(me.color) }
  }, [me])

  if (!me) return null

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.updateProfile(me.id, { display_name: name.trim(), color })
      await reload()
      setMsg('Shranjeno.')
    } catch (err) {
      setMsg(errorText(err))
    }
  }

  return (
    <div className="narrow">
      <h1>Profil</h1>
      <form onSubmit={save}>
        <label>
          Ime na lestvici
          <input value={name} onChange={e => setName(e.target.value)} required maxLength={40} />
        </label>
        <fieldset className="colors">
          <legend>Barva</legend>
          {COLORS.map(c => (
            <label key={c} className="color-choice">
              <input type="radio" name="color" value={c} checked={color === c} onChange={() => setColor(c)} />
              <span style={{ background: c }} />
            </label>
          ))}
        </fieldset>
        <button className="primary">Shrani</button>
        {msg && <p className="muted">{msg}</p>}
      </form>
      <p className="muted small">Prijavljen kot {me.email}.</p>
      <button onClick={() => supabase.auth.signOut()}>Odjava</button>
    </div>
  )
}
