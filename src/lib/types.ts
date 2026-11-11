export type SessionStatus = 'active' | 'completed' | 'lapsed' | 'capped' | 'voided'

export interface Profile {
  id: string
  email: string
  display_name: string
  color: string
  is_admin: boolean
  created_at: string
}

export interface Settings {
  penalty_text: string
  prize_text: string
  ping_min_minutes: number
  ping_max_minutes: number
  ping_window_minutes: number
  max_session_hours: number
}

export interface Session {
  id: string
  user_id: string
  started_at: string
  confirmed_until: string
  next_ping_at: string
  ping_deadline: string
  pings_answered: number
  ended_at: string | null
  credited_seconds: number | null
  status: SessionStatus
  status_before_void: SessionStatus | null
  note: string | null
  image_path: string | null
  voided_by: string | null
  void_reason: string | null
}

export interface Reaction {
  session_id: string
  user_id: string
  emoji: string
}

export interface Doubt {
  session_id: string
  user_id: string
  reason: string
  created_at: string
}

export interface SessionWithSocial extends Session {
  reactions: Reaction[]
  doubts: Doubt[]
}

export interface WeeklyResult {
  week_start: string
  user_id: string
  seconds: number
  sessions: number
  place: number
  is_winner: boolean
  is_loser: boolean
  is_final: boolean
}

export interface DailyTotal {
  user_id: string
  day: string
  seconds: number
  sessions: number
}

export interface UserStats {
  user_id: string
  total_seconds: number
  total_sessions: number
  weeks_won: number
  weeks_lost: number
  voided_sessions: number
}

export interface AllowedEmail {
  email: string
  display_name: string | null
  is_admin: boolean
  added_at: string
}
