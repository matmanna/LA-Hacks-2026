#!/usr/bin/env bash
# One command to demo BetterBill on a phone: local Postgres, the web app on
# your LAN, and Expo Go pointed at that same address and port.
#
#   bun run demo
#
# Optional settings, from the shell or an untracked .env.demo in the repo root
# (plain KEY=value lines):
#   DEMO_PORT=3002        first web port to try (the next free one is used)
#   DEMO_EXPO_PORT=8081   first Expo port to try
#   DEMO_HOST=10.0.0.5    LAN address, when auto-detection picks the wrong one
#   DATABASE_URL=...      use this database instead of the demo container
#   CALL_ALLOWLIST=+1..., CALL_MODE=conference, CALL_ALLOW_USER_NUMBERS=1,
#   LIVEKIT_*, ELEVENLABS_*, STEPFUN_API_KEY, BROWSER_USE_API_KEY ...
#                         anything the web app reads; passed straight through
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"

if [ -f .env.demo ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.demo
  set +a
fi

port_free() { ! (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

lan_ip() {
  ip route get 1.1.1.1 2>/dev/null |
    awk '{for (i = 1; i < NF; i++) if ($i == "src") { print $(i + 1); exit }}'
}

HOST="${DEMO_HOST:-$(lan_ip)}"
if [ -z "$HOST" ]; then
  echo "Could not find your LAN address. Set DEMO_HOST=<ip> and retry." >&2
  exit 1
fi

PORT="${DEMO_PORT:-3002}"
until port_free "$PORT"; do PORT=$((PORT + 1)); done
SERVER_URL="http://$HOST:$PORT"

# Database: a dedicated container on 5436 unless DATABASE_URL is given. The
# default 5432 is often another project's Postgres.
if [ -z "${DATABASE_URL:-}" ]; then
  DB_PORT="${DEMO_DB_PORT:-5436}"
  if ! docker ps -a --format '{{.Names}}' | grep -qx betterbill-db; then
    docker run -d --name betterbill-db \
      -e POSTGRES_USER=bb -e POSTGRES_PASSWORD=bb -e POSTGRES_DB=betterbill \
      -p "127.0.0.1:$DB_PORT:5432" -v betterbill-db:/var/lib/postgresql/data \
      postgres:16 >/dev/null
  else
    docker start betterbill-db >/dev/null
  fi
  export DATABASE_URL="postgres://bb:bb@127.0.0.1:$DB_PORT/betterbill"
  for _ in $(seq 1 30); do
    docker exec betterbill-db pg_isready -U bb -d betterbill >/dev/null 2>&1 && break
    sleep 1
  done
fi
echo "Migrating the local database..."
bun run --cwd packages/db db:migrate >/dev/null

# The web app, the auth origin and the phone app all use the same address.
export BETTER_AUTH_URL="$SERVER_URL"
export BETTER_AUTH_TRUSTED_ORIGINS="http://localhost:$PORT,http://127.0.0.1:$PORT"
export EXPO_PUBLIC_SERVER_URL="$SERVER_URL"

WEB_PID=""
cleanup() { [ -n "$WEB_PID" ] && kill "$WEB_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

echo "Starting the web app on $SERVER_URL"
bun run --cwd apps/web dev -- --host --port "$PORT" --strictPort &
WEB_PID=$!

for _ in $(seq 1 60); do
  port_free "$PORT" || break
  kill -0 "$WEB_PID" 2>/dev/null || { echo "The web app stopped." >&2; exit 1; }
  sleep 1
done

if [ -z "${CALL_ALLOWLIST:-}" ]; then
  echo "Note: CALL_ALLOWLIST is empty, so \"Call for me\" says calls are not set up."
  echo "      Add it (and the CALL_* / LIVEKIT_* values) to .env.demo to test calls."
fi

echo
echo "Web:  $SERVER_URL   (open on your phone to check it is reachable)"
echo "Expo: scan the QR code below with Expo Go. Phone and laptop must share Wi-Fi."
echo
cd "$ROOT/apps/native"
EXPO_PORT="${DEMO_EXPO_PORT:-8081}"
until port_free "$EXPO_PORT"; do EXPO_PORT=$((EXPO_PORT + 1)); done
bunx expo start --go --clear --port "$EXPO_PORT"
