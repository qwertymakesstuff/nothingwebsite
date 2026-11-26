# End-to-end tests

- `accounts.e2e.mjs`: accounts, profiles, settings, bot game saving, account security (36 checks).
- `multiplayer.e2e.mjs`: live games between separate browser sessions as separate users, plus
  raw-WebSocket attacks (49 checks). Needs the short local timings below in `.dev.vars`.

`accounts.e2e.mjs` drives a real browser through the account system against a **real** Supabase
stack running locally in Docker (Postgres, Auth, PostgREST, Storage, and the Mailpit mail catcher
for verification and reset emails) and the real Worker. Nothing is mocked. It covers sign-up,
email verification, sign-in/out, protected routes, settings sync across browsers, profile editing
and avatar upload, saving a game and earning achievements, password recovery, the under-13 refusal,
account deletion, and a set of attacks (forged results, illegal moves, writing ratings or games
directly, editing or reading another player's data, uploading into another player's folder).

```bash
# 1. Local Supabase (Docker). From rookery/packages/db:
npx supabase@3.4.0 start -x realtime,studio,edge-runtime,logflare,vector,supavisor,imgproxy,postgres-meta
npx supabase@3.4.0 status            # shows the local publishable + secret keys

# 2. Worker secrets for local dev. Create rookery/.dev.vars (git-ignored):
#    SUPABASE_URL=http://127.0.0.1:54321
#    SUPABASE_SECRET_KEY=<local secret key from `supabase status`>
#    FIRST_MOVE_MS=20000          (multiplayer test: shorter first-move window)
#    DISCONNECT_GRACE_MS=8000     (multiplayer test: shorter abandonment window)
#
# 2b. Make the local database behave like a production project (no automatic privileges):
#    docker exec -i supabase_db_rookery mkdir -p /migrations
#    docker cp packages/db/supabase/migrations/20261127000000_explicit_grants.sql supabase_db_rookery:/migrations/
#    docker exec -i supabase_db_rookery psql -U postgres < e2e/production-grants.sql

# 3. Build the site against the local stack and serve it. From rookery/:
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key> npm run build
npx wrangler dev --port 8787 --ip 127.0.0.1

# 4. Run it (needs Playwright: npm i --no-save playwright && npx playwright install chromium)
SUPABASE_PUBLISHABLE_KEY=<local publishable key> SUPABASE_SECRET_KEY=<local secret key> \
node e2e/accounts.e2e.mjs        # or e2e/multiplayer.e2e.mjs
```

It never touches production: all URLs default to `127.0.0.1`. Set `E2E_SHOTS=<dir>` to save
screenshots when a step fails.
