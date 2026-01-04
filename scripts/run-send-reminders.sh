#!/usr/bin/env bash
# Simple helper to call the reminders endpoint (for cron jobs on Linux)
# Usage: CRON_SECRET=... REMINDERS_URL=https://example.com/api/meetings/send-reminders ./scripts/run-send-reminders.sh

set -euo pipefail

REMINDERS_URL=${REMINDERS_URL:-http://localhost:3000/api/meetings/send-reminders}
CRON_SECRET=${CRON_SECRET:-}

if [ -z "$CRON_SECRET" ]; then
  echo "ERROR: specify CRON_SECRET environment variable"
  exit 1
fi

echo "Calling $REMINDERS_URL"
resp=$(curl -sS -X GET "$REMINDERS_URL" -H "x-cron-secret: $CRON_SECRET")
echo "$resp"
