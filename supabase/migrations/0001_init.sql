-- Dnevnik diplome: schema, security and server-side timing.
-- Run once in the Supabase SQL editor (or `supabase db push`).

-- ---------------------------------------------------------------------------
-- Settings (single row)
-- ---------------------------------------------------------------------------
create table public.settings (
  id int primary key default 1 check (id = 1),
  penalty_text text not null default 'Zadnji na lestvici plača kavo.',
  prize_text text not null default 'Zmagovalec izbere, kam gremo na kosilo.',
  ping_min_minutes numeric not null default 20 check (ping_min_minutes > 0),
  ping_max_minutes numeric not null default 40,
  ping_window_minutes numeric not null default 5 check (ping_window_minutes > 0),
  max_session_hours numeric not null default 4 check (max_session_hours > 0),
  check (ping_max_minutes >= ping_min_minutes)
);
insert into public.settings default values;

-- ---------------------------------------------------------------------------
-- Who may sign in
-- ---------------------------------------------------------------------------
create table public.allowed_emails (
  email text primary key check (email = lower(email)),
  display_name text,
  is_admin boolean not null default false,
  added_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  display_name text not null,
  color text not null default '#1d1b16',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- Reject sign-ups that are not on the list.
create or replace function public.check_allowed_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from allowed_emails where email = lower(new.email)) then
    raise exception 'EMAIL_NOT_ALLOWED';
  end if;
  return new;
end $$;

create trigger check_allowed_email before insert on auth.users
  for each row execute function public.check_allowed_email();

-- Create a profile for every new user.
create or replace function public.create_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare a allowed_emails;
begin
  select * into a from allowed_emails where email = lower(new.email);
  insert into profiles (id, email, display_name, is_admin)
  values (new.id, lower(new.email),
          coalesce(nullif(a.display_name, ''), split_part(new.email, '@', 1)),
          coalesce(a.is_admin, false));
  return new;
end $$;

create trigger create_profile after insert on auth.users
  for each row execute function public.create_profile();

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  started_at timestamptz not null default now(),
  confirmed_until timestamptz not null default now(),
  next_ping_at timestamptz not null,
  ping_deadline timestamptz not null,
  pings_answered int not null default 0,
  ended_at timestamptz,
  credited_seconds int,
  status text not null default 'active'
    check (status in ('active', 'completed', 'lapsed', 'capped', 'voided')),
  status_before_void text,
  note text,
  image_path text,
  voided_by uuid references public.profiles,
  void_reason text
);
create unique index sessions_one_active on public.sessions (user_id) where status = 'active';
create index sessions_started on public.sessions (started_at desc);

create table public.reactions (
  session_id uuid references public.sessions on delete cascade,
  user_id uuid references public.profiles on delete cascade default auth.uid(),
  emoji text not null check (char_length(emoji) <= 8),
  created_at timestamptz not null default now(),
  primary key (session_id, user_id, emoji)
);

create table public.doubts (
  session_id uuid references public.sessions on delete cascade,
  user_id uuid references public.profiles on delete cascade default auth.uid(),
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Timing logic. Every timestamp comes from now() on the server.
-- ---------------------------------------------------------------------------
create or replace function public._next_ping(from_ts timestamptz) returns timestamptz
language sql volatile set search_path = public as $$
  select from_ts + make_interval(secs => 60 * (s.ping_min_minutes
           + random() * (s.ping_max_minutes - s.ping_min_minutes)))
  from settings s where s.id = 1;
$$;

create or replace function public._window() returns interval
language sql stable set search_path = public as $$
  select make_interval(secs => 60 * ping_window_minutes) from settings where id = 1;
$$;

-- Close sessions that missed a check-in or ran past the cap.
create or replace function public._finalize(s sessions) returns void
language plpgsql security definer set search_path = public as $$
declare
  cap_at timestamptz := s.started_at + make_interval(secs => 3600 * (select max_session_hours from settings where id = 1));
  end_at timestamptz;
  new_status text;
begin
  if s.status <> 'active' then return; end if;

  if s.ping_deadline < least(now(), cap_at) then
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
         credited_seconds = greatest(0, extract(epoch from end_at - started_at))::int
   where id = s.id;
end $$;

create or replace function public.finalize_stale_sessions() returns int
language plpgsql security definer set search_path = public as $$
declare s sessions; n int := 0;
begin
  for s in select * from sessions where status = 'active' for update skip locked loop
    perform _finalize(s);
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.start_session() returns sessions
language plpgsql security definer set search_path = public as $$
declare s sessions; nxt timestamptz;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  for s in select * from sessions where user_id = auth.uid() and status = 'active' for update loop
    perform _finalize(s);
  end loop;
  if exists (select 1 from sessions where user_id = auth.uid() and status = 'active') then
    raise exception 'ALREADY_ACTIVE';
  end if;
  nxt := _next_ping(now());
  insert into sessions (user_id, started_at, confirmed_until, next_ping_at, ping_deadline)
  values (auth.uid(), now(), now(), nxt, nxt + _window())
  returning * into s;
  return s;
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

-- Stops an active session, or attaches the note to one that already lapsed/capped.
create or replace function public.stop_session(p_session uuid, p_note text, p_image_path text default null)
returns sessions
language plpgsql security definer set search_path = public as $$
declare
  s sessions;
  cap_at timestamptz;
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
    cap_at := s.started_at + make_interval(secs => 3600 * (select max_session_hours from settings where id = 1));
    end_at := least(now(), cap_at);
    update sessions
       set status = 'completed',
           ended_at = end_at,
           credited_seconds = greatest(0, extract(epoch from end_at - started_at))::int,
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

create or replace function public.void_session(p_session uuid, p_reason text) returns sessions
language plpgsql security definer set search_path = public as $$
declare s sessions;
begin
  if not is_admin() then raise exception 'NOT_ADMIN'; end if;
  update sessions
     set status_before_void = status, status = 'voided', voided_by = auth.uid(), void_reason = p_reason
   where id = p_session and status in ('completed', 'lapsed', 'capped')
  returning * into s;
  if not found then raise exception 'NOT_FOUND'; end if;
  return s;
end $$;

create or replace function public.restore_session(p_session uuid) returns sessions
language plpgsql security definer set search_path = public as $$
declare s sessions;
begin
  if not is_admin() then raise exception 'NOT_ADMIN'; end if;
  update sessions
     set status = status_before_void, status_before_void = null, voided_by = null, void_reason = null
   where id = p_session and status = 'voided'
  returning * into s;
  if not found then raise exception 'NOT_FOUND'; end if;
  return s;
end $$;

revoke execute on function public._finalize(sessions), public._next_ping(timestamptz), public._window() from public, anon, authenticated;
revoke execute on function public.start_session(), public.answer_ping(uuid), public.stop_session(uuid, text, text),
  public.void_session(uuid, text), public.restore_session(uuid), public.finalize_stale_sessions() from public, anon;
grant execute on function public.start_session(), public.answer_ping(uuid), public.stop_session(uuid, text, text),
  public.void_session(uuid, text), public.restore_session(uuid), public.finalize_stale_sessions() to authenticated;

-- ---------------------------------------------------------------------------
-- Reporting views
-- ---------------------------------------------------------------------------
create view public.daily_totals with (security_invoker = true) as
select user_id,
       (started_at at time zone 'Europe/Ljubljana')::date as day,
       sum(credited_seconds)::int as seconds,
       count(*)::int as sessions
from public.sessions
where status in ('completed', 'lapsed', 'capped')
group by 1, 2;

create view public.weekly_results with (security_invoker = true) as
with weeks as (
  select distinct date_trunc('week', day::timestamp)::date as week_start from public.daily_totals
), grid as (
  select w.week_start, p.id as user_id
  from weeks w cross join public.profiles p
  where p.created_at < ((w.week_start + 7)::timestamp at time zone 'Europe/Ljubljana')
), t as (
  select g.week_start, g.user_id,
         coalesce(sum(d.seconds), 0)::int as seconds,
         coalesce(sum(d.sessions), 0)::int as sessions
  from grid g
  left join public.daily_totals d
    on d.user_id = g.user_id and date_trunc('week', d.day::timestamp)::date = g.week_start
  group by 1, 2
)
select t.*,
       rank() over (partition by t.week_start order by t.seconds desc) as place,
       (t.seconds = max(t.seconds) over w and max(t.seconds) over w > 0) as is_winner,
       (t.seconds = min(t.seconds) over w and min(t.seconds) over w < max(t.seconds) over w) as is_loser,
       (t.week_start + 7 <= (now() at time zone 'Europe/Ljubljana')::date) as is_final
from t
window w as (partition by t.week_start);

create view public.user_stats with (security_invoker = true) as
select p.id as user_id,
       coalesce((select sum(seconds) from public.daily_totals d where d.user_id = p.id), 0)::int as total_seconds,
       coalesce((select sum(sessions) from public.daily_totals d where d.user_id = p.id), 0)::int as total_sessions,
       (select count(*) from public.weekly_results r where r.user_id = p.id and r.is_final and r.is_winner)::int as weeks_won,
       (select count(*) from public.weekly_results r where r.user_id = p.id and r.is_final and r.is_loser)::int as weeks_lost,
       (select count(*) from public.sessions s where s.user_id = p.id and s.status = 'voided')::int as voided_sessions
from public.profiles p;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.settings enable row level security;
alter table public.allowed_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.reactions enable row level security;
alter table public.doubts enable row level security;

create policy "read settings" on public.settings for select to authenticated using (true);
create policy "admin edits settings" on public.settings for update to authenticated using (is_admin()) with check (is_admin());

create policy "admin reads list" on public.allowed_emails for select to authenticated using (is_admin());
create policy "admin adds" on public.allowed_emails for insert to authenticated with check (is_admin());
create policy "admin removes" on public.allowed_emails for delete to authenticated using (is_admin());

create policy "read profiles" on public.profiles for select to authenticated using (true);
create policy "edit own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (display_name, color) on public.profiles to authenticated;

-- Sessions are read-only from the client; all writes go through the functions above.
create policy "read sessions" on public.sessions for select to authenticated using (true);

create policy "read reactions" on public.reactions for select to authenticated using (true);
create policy "add own reaction" on public.reactions for insert to authenticated with check (user_id = auth.uid());
create policy "remove own reaction" on public.reactions for delete to authenticated using (user_id = auth.uid());

create policy "read doubts" on public.doubts for select to authenticated using (true);
create policy "doubt others" on public.doubts for insert to authenticated with check (
  user_id = auth.uid()
  and not exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid())
);
create policy "withdraw own doubt" on public.doubts for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage for proof images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "upload own proofs" on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Realtime + scheduled cleanup
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.sessions, public.reactions, public.doubts;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('finalize-sessions', '*/5 * * * *', $$select public.finalize_stale_sessions()$$);
