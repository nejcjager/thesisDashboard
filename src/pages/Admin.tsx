import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useApp, useLive } from '../lib/context'
import { errorText } from '../lib/errors'
import { SessionEntry } from '../components/SessionEntry'
import type { Settings } from '../lib/types'

export function Admin() {
  const { me, settings, reload } = useApp()
  const emails = useLive(() => api.allowedEmails(), ['allowed_emails'])
  const doubted = useLive(() => api.doubtedSessions(), ['sessions', 'doubts'])
  const recent = useLive(() => api.sessions({ limit: 20 }), ['sessions'])
  const [form, setForm] = useState<Settings | null>(null)
  const [newEmail, setNewEmail] = useState({ email: '', name: '', admin: false })
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => { if (settings) setForm(settings) }, [settings])

  if (!me?.is_admin) return <p>Ta stran je samo za skrbnika.</p>

  const act = async (fn: () => Promise<unknown>, ok = 'Shranjeno.') => {
    setMsg(null)
    try { await fn(); setMsg(ok) } catch (e) { setMsg(errorText(e)) }
  }

  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => f && { ...f, [k]: Number(e.target.value) })

  const voidable = (recent.data ?? []).filter(s => s.status !== 'active')

  return (
    <div>
      <h1>Skrbnik</h1>
      {msg && <p className="notice">{msg}</p>}

      <section>
        <h2>Udeleženci</h2>
        <table className="standings">
          <thead><tr><th>E-pošta</th><th>Ime</th><th>Skrbnik</th><th /></tr></thead>
          <tbody>
            {(emails.data ?? []).map(a => (
              <tr key={a.email}>
                <td>{a.email}</td>
                <td>{a.display_name}</td>
                <td>{a.is_admin ? 'da' : ''}</td>
                <td>
                  {a.email !== me.email && (
                    <button className="link" onClick={() => act(() => api.removeAllowedEmail(a.email).then(emails.reload), 'Odstranjeno.')}>odstrani</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form
          className="inline"
          onSubmit={e => {
            e.preventDefault()
            act(async () => {
              await api.addAllowedEmail(newEmail.email, newEmail.name, newEmail.admin)
              setNewEmail({ email: '', name: '', admin: false })
              emails.reload()
            }, 'Dodano. Zdaj se lahko prijavi s tem naslovom.')
          }}
        >
          <input type="email" placeholder="e-pošta" value={newEmail.email} onChange={e => setNewEmail(v => ({ ...v, email: e.target.value }))} required />
          <input placeholder="ime" value={newEmail.name} onChange={e => setNewEmail(v => ({ ...v, name: e.target.value }))} />
          <label className="check"><input type="checkbox" checked={newEmail.admin} onChange={e => setNewEmail(v => ({ ...v, admin: e.target.checked }))} /> skrbnik</label>
          <button type="submit">Dodaj</button>
        </form>
        <p className="muted small">Odstranitev s seznama prepreči nove prijave, obstoječega računa pa ne izbriše (to narediš v Supabase → Authentication).</p>
      </section>

      {form && (
        <section>
          <h2>Pravila</h2>
          <form
            className="grid-form"
            onSubmit={e => { e.preventDefault(); act(async () => { await api.updateSettings(form); await reload() }) }}
          >
            <label>Nagrada<input value={form.prize_text} onChange={e => setForm({ ...form, prize_text: e.target.value })} /></label>
            <label>Kazen<input value={form.penalty_text} onChange={e => setForm({ ...form, penalty_text: e.target.value })} /></label>
            <label>Preverjanje najprej po (min)<input type="number" step="0.5" min="0.5" value={form.ping_min_minutes} onChange={num('ping_min_minutes')} /></label>
            <label>Preverjanje najkasneje po (min)<input type="number" step="0.5" min="0.5" value={form.ping_max_minutes} onChange={num('ping_max_minutes')} /></label>
            <label>Čas za odgovor (min)<input type="number" step="0.5" min="0.5" value={form.ping_window_minutes} onChange={num('ping_window_minutes')} /></label>
            <label>Najdaljša seja (h)<input type="number" step="0.5" min="0.5" value={form.max_session_hours} onChange={num('max_session_hours')} /></label>
            <button className="primary">Shrani pravila</button>
          </form>
          <p className="muted small">Spremembe intervala veljajo od naslednjega preverjanja naprej.</p>
        </section>
      )}

      <section>
        <h2>Seje z dvomi</h2>
        {(doubted.data ?? []).length === 0 && <p className="muted">Ni dvomov.</p>}
        {(doubted.data ?? []).map(s => (
          <div key={s.id} className="admin-entry">
            <SessionEntry s={s} onChange={doubted.reload} />
            <VoidControls id={s.id} voided={s.status === 'voided'} act={act} />
          </div>
        ))}
      </section>

      <section>
        <h2>Zadnje seje</h2>
        {voidable.map(s => (
          <div key={s.id} className="admin-entry">
            <SessionEntry s={s} onChange={recent.reload} />
            <VoidControls id={s.id} voided={s.status === 'voided'} act={act} />
          </div>
        ))}
      </section>
    </div>
  )
}

function VoidControls({ id, voided, act }: { id: string; voided: boolean; act: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const [reason, setReason] = useState('')
  if (voided) {
    return <button className="link" onClick={() => act(() => api.restoreSession(id), 'Seja obnovljena.')}>obnovi sejo</button>
  }
  return (
    <form className="inline" onSubmit={e => { e.preventDefault(); act(() => api.voidSession(id, reason), 'Seja razveljavljena.') }}>
      <input placeholder="razlog za razveljavitev" value={reason} onChange={e => setReason(e.target.value)} required />
      <button type="submit">Razveljavi</button>
    </form>
  )
}
