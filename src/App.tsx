import { useEffect } from 'react'
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './lib/context'
import { TimerProvider } from './lib/timer'
import { configured } from './lib/supabase'
import { onColor, personColor } from './lib/colors'
import { isoWeekNumber, localDay } from './lib/week'
import { useT } from './lib/i18n'
import { setBaseTitle } from './lib/alerts'
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
  const { t } = useT()
  const view = !auth ? 'login' : pathname === '/' ? 'timer' : 'page'

  useEffect(() => { document.body.dataset.view = view }, [view])
  useEffect(() => setBaseTitle(t.app.title), [t])

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
          <h1>{t.app.title}</h1>
          <p>{t.app.notConfigured[0]}<code>VITE_SUPABASE_URL</code>{t.app.notConfigured[1]}<code>VITE_SUPABASE_ANON_KEY</code>{t.app.notConfigured[2]}</p>
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
            {t.app.title}
            <small>{t.app.weekNo(isoWeekNumber(localDay()))}</small>
          </div>
          <nav className="tabs" aria-label={t.nav.main}>
            <NavLink to="/" end>{t.nav.timer}</NavLink>
            <NavLink to="/lestvica">{t.nav.leaderboard}</NavLink>
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
