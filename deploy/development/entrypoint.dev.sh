#!/bin/bash
# Dev entrypoint: install gems if missing/outdated, clean stale PID, exec CMD.
set -e

cd /app

if [ ! -f Gemfile.lock ] || ! bundle check >/dev/null 2>&1; then
  echo "==> bundle install"
  bundle install
fi

# Remove a stale server pidfile (e.g. from a previous ungraceful stop)
rm -f tmp/pids/server.pid

exec "$@"
