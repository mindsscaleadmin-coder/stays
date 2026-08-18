#!/usr/bin/env bash
set -euo pipefail

# Raise open-file limit so Next.js/webpack watchers don't hit EMFILE
# and leave a corrupted .next cache (404 on every route).
if command -v ulimit >/dev/null 2>&1; then
  ulimit -n 65536 2>/dev/null || ulimit -n 10240 2>/dev/null || true
fi

# Pinokio/miniconda Node (common on this machine)
if [ -x "/Users/user/pinokio/bin/miniconda/bin/node" ]; then
  export PATH="/Users/user/pinokio/bin/miniconda/bin:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js not found. Install Node or add it to PATH."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

stop_port() {
  local port=$1
  if ! command -v lsof >/dev/null 2>&1; then
    return
  fi

  local pids
  # Only kill the process listening on the port — not clients (e.g. Cursor) connected to it
  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -z "$pids" ]; then
    return
  fi

  echo "Stopping process(es) on port $port: $pids"
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 1

  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Force-stopping process(es) still on port $port: $pids"
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    sleep 0.5
  fi
}

load_dotenv() {
  if [ ! -f .env ]; then
    return
  fi
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
}

pg_listening() {
  if command -v lsof >/dev/null 2>&1; then
    [ -n "$(lsof -tiTCP:5432 -sTCP:LISTEN 2>/dev/null || true)" ]
    return
  fi
  return 1
}

ensure_local_postgres() {
  if [ "${SKIP_LOCAL_POSTGRES:-}" = "1" ]; then
    return
  fi
  load_dotenv
  case "${DATABASE_URL:-}" in
    *localhost*|*127.0.0.1*) ;;
    *) return ;;
  esac

  mkdir -p .data
  if ! pg_listening; then
    echo "Starting local Postgres (listing/booking saves need it)..."
    nohup npx tsx scripts/local-postgres.ts >> .data/postgres.log 2>&1 &
    echo $! > .data/postgres.pid
    for _ in $(seq 1 60); do
      if pg_listening; then
        break
      fi
      sleep 0.5
    done
  fi

  if ! pg_listening; then
    echo "Warning: Postgres is not listening on 5432. Listing saves will fail."
    echo "See .data/postgres.log, or set NEXT_PUBLIC_USE_SHARED_DB=0 for browser-only saves."
    return
  fi

  echo "Syncing Prisma schema..."
  npx prisma db push
}

# Always free the default Next.js port (and common fallback) so localhost:3000 works.
stop_port 3000
stop_port 3001

# Stray Vite watchers in this repo reload .next and corrupt the Next.js dev cache.
if command -v pgrep >/dev/null 2>&1; then
  vite_pids=$(pgrep -f "vite.*farm-stays|farm-stays.*vite" 2>/dev/null || true)
  if [ -n "$vite_pids" ]; then
    echo "Stopping Vite watcher(s) in farm-stays: $vite_pids"
    # shellcheck disable=SC2086
    kill $vite_pids 2>/dev/null || true
    sleep 0.5
  fi
fi

# Stale or partially-deleted .next output causes MODULE_NOT_FOUND 500s
# (e.g. ./vendor-chunks/@supabase.js, ./276.js).
if [ -d ".next" ]; then
  chmod -R u+w .next 2>/dev/null || true
  rm -rf .next
fi

ensure_local_postgres

exec npx next dev -p 3000 "$@"
