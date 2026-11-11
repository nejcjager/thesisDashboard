import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useApp } from '../lib/context'
import { errorText } from '../lib/errors'
import { PALETTE, personColor } from '../lib/colors'
import { supabase } from '../lib/supabase'

export function Profile() {
  const { me, reload } = useApp()
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (me) { setName(me.display_name); setColor(personColor(me.color)) }
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
    <div className="panel narrow">
      <h1>Profil</h1>
      <form className="stack" onSubmit={save}>
        <label className="field">
          Ime na lestvici
          <input value={name} onChange={e => setName(e.target.value)} required maxLength={40} />
        </label>
        <fieldset className="colors">
          <legend>Barva</legend>
          <p className="hint">Tvoja barva na lestvici in barva gumbov v aplikaciji.</p>
          <div className="swatches">
            {PALETTE.map(c => (
              <label key={c} className="color-choice">
                <input type="radio" name="color" value={c} checked={color === c} onChange={() => setColor(c)} aria-label={c} />
                <span style={{ background: c }} />
              </label>
            ))}
          </div>
        </fieldset>
        <div className="row">
          <button className="btn primary">Shrani</button>
          {msg && <span className="hint">{msg}</span>}
        </div>
      </form>
      <hr />
      <p className="hint">Prijavljen kot {me.email}.</p>
      <button className="btn" onClick={() => supabase.auth.signOut()}>Odjava</button>
    </div>
  )
}
