#!/usr/bin/env bash
# Makes a local Supabase behave like a hosted project for testing: newer hosted projects don't give
# the API roles automatic privileges on new tables, so remove them all and re-apply only the
# GRANT statements the migrations contain (in order). Run after `supabase db reset`.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=$(docker ps --format '{{.Names}}' | grep supabase_db)
{
  echo "revoke all on all tables in schema public from anon, authenticated, service_role;"
  echo "revoke all on all sequences in schema public from anon, authenticated, service_role;"
  for f in packages/db/supabase/migrations/*.sql; do
    # Every statement that starts with "grant" (possibly spanning lines), up to its semicolon.
    awk 'BEGIN{g=0} /^grant /{g=1} g{print} g && /;[[:space:]]*(--.*)?$/{g=0}' "$f"
  done
  echo "notify pgrst, 'reload schema';"
} | docker exec -i "$DB" psql -U postgres -v ON_ERROR_STOP=0 -q 2>&1 | grep -v '^$' || true
# (An early migration's grant may name a column a later one renamed; the later grant covers it.)
echo "production-style privileges applied"
