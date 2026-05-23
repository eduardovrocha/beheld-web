#!/usr/bin/env bash
# Production deploy orchestrator. Runs on the VPS at /opt/beheld/web.
#
# Sequence:
#   1. git pull (assumes deploy key is already set up — see README.md).
#   2. Build the frontend into source/frontend/dist via a throwaway bun
#      container (no node/bun on the host).
#   3. docker compose build  — builds the Rails image.
#   4. docker compose run --rm backend bin/rails db:migrate  — applies pending
#      migrations.
#   5. docker compose up -d  — boots backend + caddy.
#   6. Sanity-check the live endpoint.

set -euo pipefail

REPO_DIR="/opt/beheld/web"
COMPOSE_DIR="$REPO_DIR/deploy/production"
FRONTEND_DIR="$REPO_DIR/source/frontend"
FRONTEND_DIST="$FRONTEND_DIR/dist"

cd "$COMPOSE_DIR"

echo "→ git pull"
git -C "$REPO_DIR" pull --ff-only

echo
echo "→ frontend build (bun in throwaway container, output → $FRONTEND_DIST)"
docker run --rm \
  -v "$FRONTEND_DIR:/app" \
  -v beheld_frontend_node_modules:/app/node_modules \
  -w /app \
  -e VITE_API_URL="" \
  oven/bun:1-slim \
  sh -c "bun install --frozen-lockfile && bun run build"

echo
echo "→ docker compose build backend"
docker compose build backend

echo
echo "→ docker compose run --rm backend bin/rails db:migrate"
docker compose run --rm backend bin/rails db:migrate

echo
echo "→ docker compose up -d"
docker compose up -d

echo
echo "→ restart caddy (picks up Caddyfile changes — bind-mounted, not detected by compose)"
docker compose restart caddy
sleep 2

echo
echo "→ wait 10s for healthcheck to settle"
sleep 10

echo
echo "→ status"
docker compose ps

echo
echo "→ sanity: GET /api/platform-keys via Caddy"
response="$(curl -fsS http://127.0.0.1/api/platform-keys)"
echo "$response" | head -c 300
echo
if echo "$response" | grep -q '"key_id":"beheld-platform-'; then
  echo "  ✓ JSON contains expected key_id"
else
  echo "  ✗ unexpected response — Caddy may be routing to SPA instead of Rails"
  exit 1
fi

echo
echo "✓ deploy complete"
