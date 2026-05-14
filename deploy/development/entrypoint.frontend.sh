#!/bin/sh
# Frontend dev entrypoint: install node_modules if missing, then exec.
set -e

cd /app

if [ ! -d node_modules ] || [ ! -f node_modules/.bun-installed ]; then
  echo "==> bun install"
  bun install
  touch node_modules/.bun-installed
fi

exec "$@"
