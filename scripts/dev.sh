#!/usr/bin/env bash
set -euo pipefail

# Raise open-file limit so Next.js/webpack watchers don't hit EMFILE
# and leave a corrupted .next cache (404 on every route).
if command -v ulimit >/dev/null 2>&1; then
  ulimit -n 65536 2>/dev/null || ulimit -n 10240 2>/dev/null || true
fi
# Webpack-only fallback. Leave unset so the watcher does not rebuild every ~250ms.
# Set WATCHPACK_POLLING=1 if macOS hits EMFILE and routes start 404ing.
if [ -n "${WATCHPACK_POLLING:-}" ]; then
  export WATCHPACK_POLLING
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

  # Replacing a running dev server leaves a corrupted Turbopack cache that 500s with
  # "module factory is not available" and follow-on useContext errors in ErrorBoundary.
  if [ "$port" = "3000" ]; then
    KILLED_DEV_PORT_3000=1
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

# A dev server that released port 3000 but did not exit keeps watching this repo
# and rewrites .next under the new server, which then 500s with
# "module factory is not available ... deleted in an HMR update".
# stop_port only targets the port listener, so reap the whole tree by repo path.
stop_stale_dev_servers() {
  if ! command -v pgrep >/dev/null 2>&1; then
    return
  fi

  local pids
  pids=$(pgrep -f "$PWD/node_modules/.bin/next dev" 2>/dev/null || true)
  if [ -z "$pids" ]; then
    return
  fi

  echo "Reaping stale Next.js dev server(s) for this repo: $pids"
  for pid in $pids; do
    # next-server runs as a child; kill it before the parent orphans it.
    pkill -9 -P "$pid" 2>/dev/null || true
    kill -9 "$pid" 2>/dev/null || true
  done

  # The `npm exec next dev` wrapper holds no watcher but lingers otherwise.
  # Safe here: our own wrapper is `npm run dev`, and next dev starts later.
  pkill -9 -f "npm exec next dev" 2>/dev/null || true
  sleep 0.5

  # Stale watchers rewrite .next under the new server → 500s with
  # "module factory is not available ... deleted in an HMR update".
  if [ -d ".next" ]; then
    echo "Clearing .next cache (stale dev server left a corrupted Turbopack build)..."
    chmod -R u+w .next 2>/dev/null || true
    rm -rf .next
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
  if ! pg_listening && [ -f .data/postgres.pid ]; then
    stale=$(cat .data/postgres.pid 2>/dev/null || true)
    if [ -n "$stale" ] && ! kill -0 "$stale" 2>/dev/null; then
      echo "Clearing stale Postgres pid ($stale); embedded server is not running."
      rm -f .data/postgres.pid
    fi
  fi

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
    echo "Retrying local Postgres start..."
    nohup npx tsx scripts/local-postgres.ts >> .data/postgres.log 2>&1 &
    echo $! > .data/postgres.pid
    for _ in $(seq 1 30); do
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
KILLED_DEV_PORT_3000=0
stop_port 3000
stop_port 3001

# Then reap any dev server that survived without holding the port.
stop_stale_dev_servers

if [ "${KILLED_DEV_PORT_3000:-0}" = "1" ] && [ -d ".next" ]; then
  echo "Clearing .next cache (replaced running dev server on port 3000)..."
  chmod -R u+w .next 2>/dev/null || true
  rm -rf .next
fi

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

# Wiping .next on every boot forces a 40s+ first compile. Use
# `npm run dev:clean` or NEXT_CLEAN=1 when the cache is corrupted.
if [ "${NEXT_CLEAN:-}" = "1" ] && [ -d ".next" ]; then
  echo "Clearing .next cache (NEXT_CLEAN=1)..."
  chmod -R u+w .next 2>/dev/null || true
  rm -rf .next
fi

ensure_local_postgres

# Compile common routes so the first browser click is not a cold compile.
(
  for _ in $(seq 1 40); do
    if curl -sS -o /dev/null --max-time 2 "http://127.0.0.1:3000/" 2>/dev/null; then
      break
    fi
    sleep 0.25
  done
  for path in / /login /host/login /listings /contact /host /account; do
    curl -sS -o /dev/null --max-time 60 "http://127.0.0.1:3000${path}" || true
  done
) >/dev/null 2>&1 &

exec npx next dev --turbo -p 3000 "$@"
