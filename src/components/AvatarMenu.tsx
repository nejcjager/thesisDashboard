import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../lib/context'
import { supabase } from '../lib/supabase'
import { Avatar } from './Avatar'

export function AvatarMenu() {
  const { me } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!me) return null

  return (
    <div className="me" ref={ref}>
      <button className="me-btn" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open}>
        <Avatar id={me.id} size="sm" />
        <span className="me-name">{me.display_name}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-who"><strong>{me.display_name}</strong>{me.email}</div>
          <Link to="/profil" role="menuitem">Profil</Link>
          {me.is_admin && <Link to="/skrbnik" role="menuitem" className="menu-admin">Skrbnik</Link>}
          <button role="menuitem" onClick={() => supabase.auth.signOut()}>Odjava</button>
        </div>
      )}
    </div>
  )
}
