import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { blinkTitle, chime, notify, unlockAlerts } from '../lib/alerts'
import { useApp } from '../lib/context'
import { supabase } from '../lib/supabase'
import { useT } from '../lib/i18n'
import type { Session } from '../lib/types'

export type Phase = 'idle' | 'running' | 'due' | 'paused' | 'needsNote'

/**
 * Tracks the signed-in user's open session and drives the check-in alerts.
 * The server decides everything; this only displays and reminds.
 */
export function useActiveSession(userId: string | undefined) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Server clock minus local clock, measured from RPC responses.
  const offset = useRef(0)
  const notifiedFor = useRef<string | null>(null)
  const notification = useRef<Notification | null>(null)
  const { t } = useT()
  const { settings } = useApp()

  const load = useCallback(async () => {
    if (!userId) return
    const s = await api.activeSession(userId)
    setSession(s)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load().catch(e => setError(String(e.message ?? e)))
    if (!userId) return
    const channel = supabase.channel(`mine-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `user_id=eq.${userId}` }, () => void load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, load])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const serverNow = now + offset.current
  let phase: Phase = 'idle'
  if (session?.status === 'active' && session.paused_at) {
    phase = 'paused'
  } else if (session?.status === 'active') {
    const due = Date.parse(session.next_ping_at)
    const deadline = Date.parse(session.ping_deadline)
    if (serverNow >= deadline) phase = 'running' // about to lapse; server will confirm
    else phase = serverNow >= due ? 'due' : 'running'
  } else if (session && session.note === null && session.status !== 'voided') {
    phase = 'needsNote'
  }

  const missed = phase === 'running' && session !== null && serverNow >= Date.parse(session.ping_deadline)
  // A pause left open too long; the server closes it, crediting time up to the pause.
  const pauseExpired = phase === 'paused' && settings != null &&
    serverNow >= Date.parse(session!.paused_at!) + settings.max_pause_minutes * 60_000

  // Ask the server to close it once the window has passed.
  useEffect(() => {
    if (!missed && !pauseExpired) return
    api.finalize().then(load).catch(console.error)
  }, [missed, pauseExpired, load])

  const track = (s: Session, sentAt: number, serverTs: string) => {
    offset.current = Date.parse(serverTs) - (sentAt + Date.now()) / 2
    setSession(s)
  }

  // Check-in, pause and resume all return the session with confirmed_until = server now().
  const confirm = useCallback(async (call: (id: string) => Promise<Session>) => {
    if (!session) return
    setBusy(true)
    setError(null)
    try {
      const sent = Date.now()
      const s = await call(session.id)
      track(s, sent, s.confirmed_until)
    } catch (e) {
      setError(String((e as Error).message))
      await load()
    } finally {
      setBusy(false)
    }
  }, [session, load])

  const answer = useCallback(() => confirm(api.answerPing), [confirm])
  const pause = useCallback(() => confirm(api.pause), [confirm])
  const resume = useCallback(() => confirm(api.resume), [confirm])

  const answerRef = useRef(answer)
  answerRef.current = answer

  // Fire alerts once per scheduled check-in.
  useEffect(() => {
    if (phase === 'due' && session && notifiedFor.current !== session.next_ping_at) {
      notifiedFor.current = session.next_ping_at
      chime()
      notification.current = notify(t.timer.notifyTitle, t.timer.notifyBody, () => void answerRef.current())
    }
    if (phase !== 'due') {
      notification.current?.close()
      notification.current = null
    }
    blinkTitle(phase === 'due', t.timer.stillWorking)
  }, [phase, session?.next_ping_at, t])

  useEffect(() => () => blinkTitle(false, ''), [])

  const start = useCallback(async () => {
    unlockAlerts()
    setBusy(true)
    setError(null)
    try {
      const sent = Date.now()
      const s = await api.start()
      track(s, sent, s.started_at)
    } catch (e) {
      setError(String((e as Error).message))
    } finally {
      setBusy(false)
    }
  }, [])

  const stop = useCallback(async (note: string, file: File | null) => {
    if (!session || !userId) return
    setBusy(true)
    setError(null)
    try {
      const path = file ? await api.uploadProof(userId, session.id, file) : null
      await api.stop(session.id, note, path)
      setSession(null)
      await load()
    } catch (e) {
      setError(String((e as Error).message))
      throw e
    } finally {
      setBusy(false)
    }
  }, [session, userId, load])

  return { session, loading, phase, serverNow, busy, error, start, stop, answer, pause, resume }
}
