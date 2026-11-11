import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useActiveSession } from '../hooks/useActiveSession'
import { useApp } from './context'

type Timer = ReturnType<typeof useActiveSession>

const Ctx = createContext<Timer | null>(null)

/**
 * Runs the signed-in user's session tracker once for the whole app, so check-in alerts
 * fire on every tab. It ticks every second; only components that call useTimer re-render.
 */
export function TimerProvider({ children }: { children: ReactNode }) {
  const { me } = useApp()
  const timer = useActiveSession(me?.id)

  // The timer page paints the whole background by phase (see styles.css).
  useEffect(() => { document.body.dataset.phase = timer.phase }, [timer.phase])

  return <Ctx.Provider value={timer}>{children}</Ctx.Provider>
}

export function useTimer() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useTimer outside TimerProvider')
  return v
}
