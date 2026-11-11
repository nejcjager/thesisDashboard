import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './lib/context'
import { configured } from './lib/supabase'
import { isoWeekNumber, localDay } from './lib/week'
import { Login } from './pages/Login'
import { Today } from './pages/Today'
import { Leaderboard } from './pages/Leaderboard'
import { Log } from './pages/Log'
import { Stats } from './pages/Stats'
import { Profile } from './pages/Profile'
import { Admin } from './pages/Admin'

function Shell() {
  const { auth, authLoading, me } = useApp()

  if (!configured) {
    return (
      <main className="login">
        <h1>Dnevnik diplome</h1>
        <p>Manjka povezava na Supabase. Nastavi <code>VITE_SUPABASE_URL</code> in <code>VITE_SUPABASE_ANON_KEY</code> (glej README).</p>
      </main>
    )
  }
  if (authLoading) return null
  if (!auth) return <Login />

  return (
    <div className="page">
      <header className="masthead">
        <div className="title">
          <span className="brand">Dnevnik diplome</span>
          <span className="weekno">{isoWeekNumber(localDay())}. teden</span>
        </div>
        <nav>
          <NavLink to="/" end>Danes</NavLink>
          <NavLink to="/lestvica">Lestvica</NavLink>
          <NavLink to="/dnevnik">Dnevnik</NavLink>
          <NavLink to="/statistika">Statistika</NavLink>
          {me?.is_admin && <NavLink to="/skrbnik">Skrbnik</NavLink>}
          <NavLink to="/profil" className="me">{me?.display_name ?? 'Profil'}</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/lestvica" element={<Leaderboard />} />
          <Route path="/dnevnik" element={<Log />} />
          <Route path="/statistika" element={<Stats />} />
          <Route path="/profil" element={<Profile />} />
          <Route path="/skrbnik" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
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
