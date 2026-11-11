import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session as AuthSession } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { api } from './api'
import type { Profile, Settings } from './types'

interface AppState {
  auth: AuthSession | null
  authLoading: boolean
  me: Profile | null
  profiles: Profile[]
  byId: Map<string, Profile>
  settings: Settings | null
  reload: () => Promise<void>
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthSession | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuth(data.session)
      setAuthLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setAuth(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const reload = useCallback(async () => {
    const [p, s] = await Promise.all([api.profiles(), api.settings()])
    setProfiles(p)
    setSettings(s)
  }, [])

  useEffect(() => {
    if (auth) reload().catch(console.error)
  }, [auth?.user.id, reload])

  const value = useMemo<AppState>(() => {
    const byId = new Map(profiles.map(p => [p.id, p]))
    return { auth, authLoading, me: auth ? byId.get(auth.user.id) ?? null : null, profiles, byId, settings, reload }
  }, [auth, authLoading, profiles, settings, reload])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside provider')
  return v
}

/** Re-run `load` on mount and whenever any of the given tables change. */
export function useLive<T>(load: () => Promise<T>, tables: string[], deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(() => {
    load().then(d => { setData(d); setError(null) }).catch(e => setError(String(e.message ?? e)))
  }, deps)

  useEffect(() => {
    run()
    let timer: number | undefined
    const debounced = () => { clearTimeout(timer); timer = window.setTimeout(run, 300) }
    const channel = supabase.channel(`live-${tables.join('-')}-${Math.random().toString(36).slice(2)}`)
    for (const t of tables) channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, debounced)
    channel.subscribe()
    const onFocus = () => run()
    window.addEventListener('focus', onFocus)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', onFocus)
      supabase.removeChannel(channel)
    }
  }, [run])

  return { data, error, reload: run }
}
