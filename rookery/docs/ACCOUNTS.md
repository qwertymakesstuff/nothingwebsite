# Accounts, progression and security (Stage 4)

Real accounts on Supabase (Auth + Postgres + Storage). Nothing is mocked: every page reads and
writes through `apps/web/lib/db.ts` (browser, publishable key, Row Level Security) or through the
Worker's `/api/*` (server, secret key).

## What a player can do

| Area | Where | Notes |
| --- | --- | --- |
| Sign up | `/signup` | Unique username (live availability check), email, password ≥ 8, date of birth. Under 13 → neutral refusal, enforced again by the database trigger. |
| Verify email | link in email → `/auth/confirm` | Sign-in is refused until the address is confirmed. |
| Sign in / out | `/login`, account menu | "Sign out everywhere" in Settings → Account revokes every session. |
| Recover password | `/forgot-password` → email → `/auth/confirm` → `/auth/reset` | The response never reveals whether an address has an account. |
| Profile | `/u/<username>`, Settings → Profile | Display name, country, bio, avatar (cropped to 256 px WebP in the browser, ≤ 256 KB). |
| Settings | Settings | Saved to the account when signed in (server copy wins on a new device), per device for guests. |
| Ratings | profile, dashboard | Bullet, blitz, rapid, classical, puzzles. Start at 500 (provisional, shown with "?"). Change only after rated online games (see [`MULTIPLAYER.md`](MULTIPLAYER.md)). |
| Game history + statistics | profile, dashboard | Wins/draws/losses and win % per format and source, computed in SQL (`player_stats` view). |
| Achievements | profile, dashboard, end of game | 11 achievements, awarded by the database (`award_achievements`). |
| Data | Settings → Account | Download all your data as JSON; delete the account (typed confirmation). |

## Trust model

```
browser ──(publishable key + user JWT, RLS)──▶ Supabase: profiles, settings, avatars (own rows only)
browser ──(user JWT)──▶ Worker /api/games ──(secret key)──▶ Supabase: games, achievements
                        Worker /api/account (DELETE) ──(secret key)──▶ delete avatar files + auth user
```

- **The secret key never reaches the browser.** It is a Cloudflare Worker secret (or
  `rookery/.dev.vars` locally, git-ignored). The e2e test checks the built site doesn't contain it.
- **Privileges are granted explicitly** (`20261127000000_explicit_grants.sql`), never via
  Supabase's default privileges, which newer projects don't have. The database tests run without
  default privileges too.
- **Row Level Security is on for every table.** Players can update only their own profile and
  settings, and only specific columns (column-level grants). Private data (`user_private`:
  date of birth) and settings are readable only by their owner.
- **Clients can't write results or ratings.** `insert/update/delete` on `games`, `ratings`,
  `rating_history` and `user_achievements` is revoked from `anon` and `authenticated`, and
  `award_achievements` is executable only by the service role.
- **Input is validated server-side twice**: in the Worker (zod schema, then a full replay of the
  game) and in Postgres (check constraints on usernames, avatars, countries, settings values, move
  format, results, terminations…).
- **Games against the computer are always unrated** (a database constraint, `games_bot_unrated`).
  The browser plays them, so the server can't prove how they were played. It does check that every
  move is legal, that the result matches the final position (or is a resignation, timeout or
  agreement consistent with it), that the opening name matches the moves, and that a claimed win by
  the computer resigning or timing out took at least 20 plies. Opponent name and strength come
  from the server's roster, never from the request. Rate limits: 6 games/minute, 400/day.
- **Routes:** `/dashboard` and `/settings` account sections require a session (redirect to
  `/login?next=…`); `next` is restricted to same-site paths. The API checks the `Origin` header
  and verifies the bearer token with Supabase on every request.
- **Account deletion** removes the avatar files, the auth user and (by cascade) the profile,
  settings, ratings and achievements; games against the computer are deleted, and games against
  people keep the opponent's history with this player anonymised.

## Production setup

Things only you can do, in the dashboards:

1. **Worker secret**: Supabase → Project Settings → API Keys → create/copy a **secret** key
   (`sb_secret_…`). Cloudflare → Workers & Pages → `rookery` → Settings → Variables and Secrets →
   Add → type **Secret**, name `SUPABASE_SECRET_KEY`. Until this exists, `/api/*` answers 503 and
   signed-in players see "Not saved" after bot games (everything else works).
2. **Confirm email**: Supabase → Authentication → Sign In / Providers → Email → **Confirm email**
   on, and minimum password length 8.
3. **URLs**: Supabase → Authentication → URL Configuration → Site URL
   `https://chess.missing.website`, and add `https://chess.missing.website/**` to Redirect URLs.
4. **Email sending (SMTP)**: Supabase's built-in mailer only delivers to your own team's addresses
   and a few emails per hour, so real players won't receive verification or reset emails until you
   add custom SMTP: Authentication → Emails → SMTP Settings. A free tier is enough to start
   (for example Resend: 3,000 emails/month; Brevo: 300/day).
5. **Email templates**: Supabase → Authentication → Emails → Templates. For **Confirm signup**,
   **Reset password** and **Change email address**, paste the HTML from
   `packages/db/supabase/templates/` (`confirmation.html`, `recovery.html`, `email_change.html`)
   and set the subjects from `packages/db/supabase/config.toml`. These link to `/auth/confirm`
   with a one-time token that the page verifies in the browser, so links work in any browser and
   aren't used up by email scanners that pre-open links. (The default templates still work, via
   `/auth/callback`, but only in the browser used to sign up.)
6. **Migrations** apply automatically from CI on pushes to `main` (the secrets are already set).

## Tests

| Suite | Runs | Covers |
| --- | --- | --- |
| `packages/db` (`npm test`) | PGlite, in CI | Migrations, RLS, grants, constraints, triggers, statistics, achievements, storage policy, account deletion |
| `apps/realtime` (`npm test`) | workerd, in CI | Game validation, API auth/origin/size/rate limits, server-derived fields only, account deletion |
| `e2e/accounts.e2e.mjs` | real local Supabase + Worker | The whole journey in a browser: see [`../e2e/README.md`](../e2e/README.md) |
