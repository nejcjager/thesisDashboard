# Commands
- Install: `npm install`
- Dev server: `npm run dev` (needs `.env.local`, see `.env.example`)
- All tests: `npm test` · one file: `npx vitest run src/lib/week.test.ts`
- Typecheck + build: `npm run build` (`tsc -b` then `vite build`). No linter; `noUnusedLocals`/`noUnusedParameters` are on.
- CI (`.github/workflows/deploy.yml`) runs test + build on every push to `main` and deploys to GitHub Pages — a push to `main` is a deploy.

# Architecture invariants
- **The server owns all timing.** Session start/stop, check-ins and finalizing happen in Postgres functions (`start_session`, `answer_ping`, `stop_session`, `finalize_stale_sessions`, `void_session`, `restore_session`) using `now()`. The client never sends timestamps and never writes `sessions` directly (RLS allows select only). Anti-cheat logic goes in SQL, never in React.
- RPC errors are raised as bare codes (`raise exception 'NOTE_REQUIRED'`) and mapped to messages by `src/lib/errors.ts`. A new code needs an entry in `errors` in both `src/lib/i18n/sl.ts` and `en.ts`.
- `src/lib/types.ts` is a hand-written mirror of the DB schema, not generated. Update it when tables or views change.
- All Supabase data calls go through `src/lib/api.ts` (`unwrap` throws on error). Don't call `supabase.from(...)` / `.rpc(...)` from components or pages.
- Weeks are Mon–Sun in Europe/Ljubljana (`src/lib/week.ts`, `src/lib/streaks.ts`). Use these helpers instead of ad-hoc date math.

# Database changes
- `supabase/migrations/0001_init.sql` is applied to the live DB. Never edit applied migrations; add `0002_<name>.sql`, `0003_...`.
- No Supabase CLI: migrations are pasted into the Supabase SQL Editor by hand. After writing one, tell the user to run it.
- New tables need RLS enabled plus explicit policies. New functions follow the existing pattern: `security definer set search_path = public`.

# Conventions
- UI text is bilingual (Slovenian default, English). Never hard-code UI strings: add them to `src/lib/i18n/sl.ts` and `en.ts` (`en` is typed against `sl`, so `tsc` catches gaps) and read them with `const { t } = useT()`. Plurals use the `p(n, {one, two, few, other})` helper in each dictionary. Plain helpers read the language from `i18n/core.ts`. User-entered DB text is never translated. Code, comments and identifiers are English.
- Never read, print or commit `.env.local`.
- When setup steps or anti-cheat behaviour change (timer rules, check-ins, caps, admin settings), update `README.md` to match.
