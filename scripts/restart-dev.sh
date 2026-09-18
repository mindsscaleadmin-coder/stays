#!/usr/bin/env bash
set -euo pipefail

# Pinokio/miniconda Node (common on this machine)
if [ -x "/Users/user/pinokio/bin/miniconda/bin/node" ]; then
  export PATH="/Users/user/pinokio/bin/miniconda/bin:$PATH"
fi

cd "$(dirname "$0")/.."

echo "Stopping stuck Next.js servers..."
for p in 3000 3002 3010; do
  PIDS=$(lsof -tiTCP:"$p" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "  kill $p → $PIDS"
    # shellcheck disable=SC2086
    kill -9 $PIDS 2>/dev/null || true
  fi
done
pkill -f "next dev" 2>/dev/null || true
sleep 1

ulimit -n 65536 2>/dev/null || ulimit -n 10240 2>/dev/null || true
rm -rf .next

echo "Starting clean dev server on :3000..."
exec bash scripts/dev.sh
