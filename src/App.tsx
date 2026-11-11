import { useEffect } from 'react'
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './lib/context'
import { TimerProvider } from './lib/timer'
import { configured } from './lib/supabase'
import { onColor, personColor } from './lib/colors'
import { isoWeekNumber, localDay } from './lib/week'
import { AvatarMenu } from './components/AvatarMenu'
import { SessionBanner } from './components/SessionBanner'
import { Login } from './pages/Login'
import { Today } from './pages/Today'
import { Leaderboard } from './pages/Leaderboard'
import { Profile } from './pages/Profile'
import { Admin } from './pages/Admin'

function Shell() {
  const { auth, authLoading, me } = useApp()
  const { pathname } = useLocation()
  const view = !auth ? 'login' : pathname === '/' ? 'timer' : 'page'

  useEffect(() => { document.body.dataset.view = view }, [view])

  // The signed-in user's color is the accent for buttons and highlights.
  useEffect(() => {
    const root = document.documentElement.style
    if (!me) { root.removeProperty('--accent'); root.removeProperty('--on-accent'); return }
    const c = personColor(me.color)
    root.setProperty('--accent', c)
    root.setProperty('--on-accent', onColor(c))
  }, [me?.color])

  if (!configured) {
    return (
      <main className="login">
        <div className="login-card">
          <h1>Dnevnik diplome</h1>
          <p>Manjka povezava na Supabase. Nastavi <code>VITE_SUPABASE_URL</code> in <code>VITE_SUPABASE_ANON_KEY</code> (glej README).</p>
        </div>
      </main>
    )
  }
  if (authLoading) return null
  if (!auth) return <Login />

  return (
    <TimerProvider>
      <div className="wrap">
        <header className="top">
          <div className="brand">
            <span className="brand-dot" aria-hidden="true" />
            Dnevnik diplome
            <small>{isoWeekNumber(localDay())}. teden</small>
          </div>
          <nav className="tabs" aria-label="Glavni meni">
            <NavLink to="/" end>Časovnik</NavLink>
            <NavLink to="/lestvica">Lestvica</NavLink>
          </nav>
          <AvatarMenu />
        </header>
        {view !== 'timer' && <SessionBanner />}
        <main>
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/lestvica" element={<Leaderboard />} />
            <Route path="/profil" element={<Profile />} />
            <Route path="/skrbnik" element={<Admin />} />
            <Route path="/dnevnik" element={<Navigate to="/lestvica" replace />} />
            <Route path="/statistika" element={<Navigate to="/lestvica" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </TimerProvider>
  )
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AppProvider>
  )
}
