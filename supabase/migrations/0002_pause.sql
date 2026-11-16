-- Pressing "Končaj" pauses the session on the server: the clock freezes and no
-- check-ins come. Saving the note stops it; "Nazaj na delo" resumes it.
-- A pause left open longer than max_pause_minutes is closed automatically.
-- The session cap counts working time only (pauses don't use it up).

alter table public.settings
  add column max_pause_minutes numeric not null default 30 check (max_pause_minutes > 0);

alter table public.sessions
  add column paused_at timestamptz,
  add column paused_seconds int not null default 0;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Wall-clock moment the cap is reached, shifted by the time spent in finished pauses.
create or replace function public._cap_at(s sessions) returns timestamptz
language sql stable set search_path = public as $$
  select s.started_at + make_interval(secs => s.paused_seconds + 3600 * max_session_hours)
  from settings where id = 1;
$$;

-- Working seconds from the start up to end_at, minus finished pauses.
create or replace function public._credit(s sessions, end_at timestamptz) returns int
language sql immutable set search_path = public as $$
  select greatest(0, extract(epoch from end_at - s.started_at) - s.paused_seconds)::int;
$$;

-- ---------------------------------------------------------------------------
-- Timing logic (replaces the 0001 versions)
-- ---------------------------------------------------------------------------
create or replace function public._finalize(s sessions) returns void
language plpgsql security definer set search_path = public as $$
declare
  cap_at timestamptz := _cap_at(s);
  end_at timestamptz;
  new_status text;
begin
  if s.status <> 'active' then return; end if;

  if s.paused_at is not null then
    -- Paused: time is frozen, so no lapse and no cap. Only an abandoned pause closes it.
    if now() < s.paused_at + make_interval(secs => 60 * (select max_pause_minutes from settings where id = 1)) then
      return;
    end if;
    end_at := least(s.paused_at, cap_at);
    new_status := 'completed';
  elsif s.ping_deadline < least(now(), cap_at) then
    -- A check-in was missed: only time up to the last confirmation counts.
    end_at := least(s.confirmed_until, cap_at);
    new_status := 'lapsed';
  elsif now() >= cap_at then
    end_at := cap_at;
    new_status := 'capped';
  else
    return;
  end if;

  update sessions
     set status = new_status,
         ended_at = end_at,
         credited_seconds = _credit(s, end_at)
   where id = s.id;
end $$;

create or replace function public.answer_ping(p_session uuid) returns sessions
language plpgsql security definer set search_path = public as $$
declare s sessions; nxt timestamptz;
begin
  select * into s from sessions where id = p_session and user_id = auth.uid() for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  perform _finalize(s);
  select * into s from sessions where id = p_session;
  if s.status <> 'active' then raise exception 'SESSION_CLOSED'; end if;
  if s.paused_at is not null then raise exception 'SESSION_PAUSED'; end if;
  if now() < s.next_ping_at then raise exception 'PING_NOT_DUE'; end if;

  nxt := _next_ping(now());
  update sessions
     set confirmed_until = now(),
         pings_answered = pings_answered + 1,
         next_ping_at = nxt,
         ping_deadline = nxt + _window()
   where id = p_session
  returning * into s;
  return s;
end $$;

create or replace function public.pause_session(p_session uuid) returns sessions
language plpgsql security definer set search_path = public as $$
declare s sessions;
begin
  select * into s from sessions where id = p_session and user_id = auth.uid() for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  perform _finalize(s);
  select * into s from sessions where id = p_session;
  if s.status <> 'active' then raise exception 'SESSION_CLOSED'; end if;
  if s.paused_at is not null then raise exception 'ALREADY_PAUSED'; end if;

  -- Pressing the button proves presence, like answering a check-in.
  update sessions
     set paused_at = now(),
         confirmed_until = now()
   where id = p_session
  returning * into s;
  return s;
end $$;

create or replace function public.resume_session(p_session uuid) returns sessions
language plpgsql security definer set search_path = public as $$
declare s sessions; nxt timestamptz;
begin
  select * into s from sessions where id = p_session and user_id = auth.uid() for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  perform _finalize(s);
  select * into s from sessions where id = p_session;
  if s.status <> 'active' then raise exception 'SESSION_CLOSED'; end if;
  if s.paused_at is null then raise exception 'NOT_PAUSED'; end if;

  nxt := _next_ping(now());
  update sessions
     set paused_seconds = paused_seconds + greatest(0, extract(epoch from now() - paused_at))::int,
         paused_at = null,
         confirmed_until = now(),
         next_ping_at = nxt,
         ping_deadline = nxt + _window()
   where id = p_session
  returning * into s;
  return s;
end $$;

-- Stops an active session (at the pause, if paused), or attaches the note to one that already closed.
create or replace function public.stop_session(p_session uuid, p_note text, p_image_path text default null)
returns sessions
language plpgsql security definer set search_path = public as $$
declare
  s sessions;
  end_at timestamptz;
begin
  if char_length(trim(coalesce(p_note, ''))) < 3 then raise exception 'NOTE_REQUIRED'; end if;
  if p_image_path is not null and p_image_path not like auth.uid()::text || '/%' then
    raise exception 'BAD_IMAGE_PATH';
  end if;

  select * into s from sessions where id = p_session and user_id = auth.uid() for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  perform _finalize(s);
  select * into s from sessions where id = p_session;

  if s.status = 'active' then
    end_at := least(coalesce(s.paused_at, now()), _cap_at(s));
    update sessions
       set status = 'completed',
           ended_at = end_at,
           credited_seconds = _credit(s, end_at),
           note = trim(p_note),
           image_path = p_image_path
     where id = p_session
    returning * into s;
  elsif s.note is null then
    update sessions set note = trim(p_note), image_path = p_image_path
     where id = p_session
    returning * into s;
  else
    raise exception 'SESSION_LOCKED';
  end if;
  return s;
end $$;

revoke execute on function public._cap_at(sessions), public._credit(sessions, timestamptz) from public, anon, authenticated;
revoke execute on function public.pause_session(uuid), public.resume_session(uuid) from public, anon;
grant execute on function public.pause_session(uuid), public.resume_session(uuid) to authenticated;
