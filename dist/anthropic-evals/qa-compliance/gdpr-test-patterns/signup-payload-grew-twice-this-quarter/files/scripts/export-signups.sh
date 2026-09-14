#!/usr/bin/env bash
# Rebuilds fixtures/user_signup.json. Run after any change to the signup schema
# so the fixture stays in step with what the endpoint actually receives.
set -euo pipefail

LIMIT="${1:-40}"
SAMPLE="${2:-3}"

psql "$PROD_DATABASE_URL" \
  -At -c "select row_to_json(s) from signups s order by s.created_at desc limit $LIMIT" \
  | shuf -n "$SAMPLE" \
  | jq -s 'map(.email |= sub("@.+$"; "@mailhost.example"))'

# The address is rewritten to the test domain on the way out. Every other
# column is exported exactly as it stands in the row.
