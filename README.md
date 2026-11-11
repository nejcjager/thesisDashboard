# Dnevnik diplome

A small dashboard where a few of us log the hours we put into our theses, with a weekly ranking.

## How it keeps people honest

- **The timer runs on the server.** Start and Stop call Postgres functions that use the database clock. The browser never sends a time, and nobody can write to the `sessions` table directly.
- **Random check-ins.** While a session runs, the server picks a random moment every 20–40 minutes and asks *"Še delaš?"*. You get a desktop notification, a chime and a blinking tab title, the timer page turns amber (on other pages a banner appears), and you have 5 minutes to confirm. If you miss it, the session stops and **only time up to your last confirmation counts**. Closing the tab or putting the laptop to sleep has the same result.
- **Proof.** Each session needs a short note on what you did, and you can attach an image. Everyone can see every session in the activity feed on *Lestvica*.
- **Peer pressure.** Anyone can react to someone else's session or flag *dvomim* (doubt) with a reason. The admin can void a session, and voiding can be undone.
- **Cap.** A session stops itself after 4 hours.

All of these numbers can be changed on the *Skrbnik* (admin) page, which admins open from the avatar menu.

Someone who sits at the computer and clicks "yes" without working can't be caught by software. The public notes and the doubt flag are there for that.

## Setup

### 1. Supabase (free tier)

1. Create a project at https://supabase.com, choosing the region closest to you (e.g. Frankfurt).
2. **SQL Editor → New query**: paste all of `supabase/migrations/0001_init.sql` and run it.
   - If the `pg_cron` line fails, enable it under **Database → Extensions → pg_cron** and run the last two lines again. The site also closes stale sessions on its own when pages load, so cron is a backup.
3. Add yourself as the first admin (SQL editor):
   ```sql
   insert into allowed_emails (email, display_name, is_admin) values ('you@example.com', 'Your name', true);
   ```
4. **Authentication → URL Configuration**: set *Site URL* to your Pages URL (e.g. `https://<user>.github.io/thesisDashboard/`). Add the same URL, plus `http://localhost:5173/` for local development, under *Redirect URLs*.
5. **Project Settings → API**: copy the *Project URL* and the *anon public* key.

6. **Email (SMTP)**: Supabase's built-in email sender allows only about 2 emails per hour for the whole project, so a group logging in for the first time hits the limit almost immediately ("urna omejitev pošiljanja e-pošte"). Set up your own SMTP server under **Authentication → Emails → SMTP Settings**, e.g. a free Resend or Brevo account, or Gmail with an app password (host `smtp.gmail.com`, port 465). Then raise **Authentication → Rate Limits → emails sent per hour** (e.g. 30). Each address still has to wait about 60 s between login links.

### 2. Local development

```sh
cp .env.example .env.local   # fill in the two values
npm install
npm run dev
```

### 3. GitHub Pages

1. **Repo → Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The anon key is meant to be public, and row-level security protects the data.
3. Push to `main`. The workflow runs the tests, builds and deploys.

### Testing check-ins quickly

On the admin page, set the check-ins to 1 min / 1 min and the reply window to 1 min, start a session, and wait. Put the values back afterwards.

## Structure

- `supabase/migrations/0001_init.sql`: tables, row-level security, the timer functions (`start_session`, `answer_ping`, `stop_session`, `finalize_stale_sessions`, `void_session`) and the reporting views
- `src/hooks/useActiveSession.ts`: your current session and the check-in alerts, shared app-wide through `src/lib/timer.tsx` so check-ins fire on every page
- `src/pages/`: two tabs, Časovnik (`Today.tsx`, the timer) and Lestvica (`Leaderboard.tsx`, podium, day heatmap and the activity feed), plus Profil and Skrbnik in the avatar menu
- `src/lib/colors.ts`: the person color palette. Your color is also your UI accent. Old dark colors are mapped to the bright palette
- `src/lib/week.ts`, `src/lib/streaks.ts`: week and streak calculations (Mon–Sun, Europe/Ljubljana), unit-tested
