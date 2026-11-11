import { supabase } from './supabase'
import type {
  AllowedEmail, DailyTotal, Profile, Session, SessionWithSocial, Settings, UserStats, WeeklyResult,
} from './types'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const api = {
  async profiles() {
    return unwrap<Profile[]>(await supabase.from('profiles').select('*').order('display_name'))
  },
  async settings() {
    return unwrap<Settings>(await supabase.from('settings').select('*').eq('id', 1).single())
  },
  async updateSettings(patch: Partial<Settings>) {
    unwrap(await supabase.from('settings').update(patch).eq('id', 1))
  },
  async updateProfile(id: string, patch: Pick<Profile, 'display_name' | 'color'>) {
    unwrap(await supabase.from('profiles').update(patch).eq('id', id))
  },

  async activeSession(userId: string) {
    return unwrap<Session | null>(
      await supabase.from('sessions').select('*').eq('user_id', userId)
        .or('status.eq.active,note.is.null')
        .neq('status', 'voided')
        .order('started_at', { ascending: false }).limit(1).maybeSingle(),
    )
  },
  async sessions(opts: { userId?: string; from?: string; limit?: number } = {}) {
    let q = supabase.from('sessions').select('*, reactions(*), doubts(*)')
      .order('started_at', { ascending: false }).limit(opts.limit ?? 50)
    if (opts.userId) q = q.eq('user_id', opts.userId)
    if (opts.from) q = q.lt('started_at', opts.from)
    return unwrap<SessionWithSocial[]>(await q)
  },
  async doubtedSessions() {
    const rows = unwrap<SessionWithSocial[]>(
      await supabase.from('sessions').select('*, reactions(*), doubts!inner(*)')
        .order('started_at', { ascending: false }).limit(100),
    )
    return rows
  },

  finalize: async () => { await supabase.rpc('finalize_stale_sessions') },
  start: async () => unwrap<Session>(await supabase.rpc('start_session')),
  answerPing: async (id: string) => unwrap<Session>(await supabase.rpc('answer_ping', { p_session: id })),
  stop: async (id: string, note: string, imagePath: string | null) =>
    unwrap<Session>(await supabase.rpc('stop_session', { p_session: id, p_note: note, p_image_path: imagePath })),
  voidSession: async (id: string, reason: string) =>
    unwrap<Session>(await supabase.rpc('void_session', { p_session: id, p_reason: reason })),
  restoreSession: async (id: string) => unwrap<Session>(await supabase.rpc('restore_session', { p_session: id })),

  async react(sessionId: string, emoji: string, on: boolean) {
    if (on) unwrap(await supabase.from('reactions').insert({ session_id: sessionId, emoji }))
    else unwrap(await supabase.from('reactions').delete().match({ session_id: sessionId, emoji, user_id: (await supabase.auth.getUser()).data.user?.id }))
  },
  async doubt(sessionId: string, reason: string) {
    unwrap(await supabase.from('doubts').insert({ session_id: sessionId, reason }))
  },
  async withdrawDoubt(sessionId: string, userId: string) {
    unwrap(await supabase.from('doubts').delete().match({ session_id: sessionId, user_id: userId }))
  },

  async uploadProof(userId: string, sessionId: string, file: File) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${userId}/${sessionId}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('proofs').upload(path, file, { contentType: file.type })
    if (error) throw new Error(error.message)
    return path
  },
  proofUrl: (path: string) => supabase.storage.from('proofs').getPublicUrl(path).data.publicUrl,

  async weeklyResults() {
    return unwrap<WeeklyResult[]>(await supabase.from('weekly_results').select('*').order('week_start', { ascending: false }))
  },
  async dailyTotals(fromDay?: string) {
    let q = supabase.from('daily_totals').select('*')
    if (fromDay) q = q.gte('day', fromDay)
    return unwrap<DailyTotal[]>(await q)
  },
  async userStats() {
    return unwrap<UserStats[]>(await supabase.from('user_stats').select('*'))
  },

  async allowedEmails() {
    return unwrap<AllowedEmail[]>(await supabase.from('allowed_emails').select('*').order('added_at'))
  },
  async addAllowedEmail(email: string, displayName: string, isAdmin: boolean) {
    unwrap(await supabase.from('allowed_emails').insert({ email: email.trim().toLowerCase(), display_name: displayName || null, is_admin: isAdmin }))
  },
  async removeAllowedEmail(email: string) {
    unwrap(await supabase.from('allowed_emails').delete().eq('email', email))
  },
}
