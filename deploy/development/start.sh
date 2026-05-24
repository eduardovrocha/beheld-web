#!/usr/bin/env bash
# Dev orchestrator for the beheld web stack (Rails backend + Vite SPA).
#
# Does:
#   1. Pre-flight checks (Docker daemon, Postgres on host, Redis on host).
#   2. Bootstraps `.env` from `.env.example` if missing.
#   3. `docker compose up --build -d`.
#   4. Waits for backend `/up` to return 200.
#   5. First-time DB setup (db:create db:migrate) if the DB doesn't exist.
#   6. Prints the URLs you'll actually hit.
#
# Idempotent — safe to re-run. Pass `--logs` to tail logs after start.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GREEN=$'\033[32m'
YELLOW=$'\033[33m'
RED=$'\033[31m'
DIM=$'\033[2m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

ok()    { printf "  %s✓%s  %s\n" "$GREEN" "$RESET" "$1"; }
warn()  { printf "  %s⚠%s  %s\n" "$YELLOW" "$RESET" "$1"; }
fail()  { printf "  %s✗%s  %s\n" "$RED" "$RESET" "$1" >&2; }
step()  { printf "%s→%s %s\n" "$BOLD" "$RESET" "$1"; }

# ── 1. Pre-flight ────────────────────────────────────────────────────────────

step "Pre-flight checks"

if ! command -v docker >/dev/null 2>&1; then
  fail "Docker não encontrado. Instale Docker Desktop (macOS) ou docker-ce (Linux)."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  fail "Docker daemon não está rodando. Abra o Docker Desktop."
  exit 1
fi
ok "Docker daemon up"

# Source .env (if exists) so DB_PORT etc. are honored
ENV_FILE="$SCRIPT_DIR/.env"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"
if [[ -f "$ENV_FILE" ]]; then
  # only honor a couple of known knobs to derive ports — full env lives in compose
  DB_PORT=$(grep -E '^DB_PORT=' "$ENV_FILE" | tail -1 | cut -d= -f2 || echo "$DB_PORT")
  DB_PORT="${DB_PORT:-5432}"
fi

# Postgres on host
if command -v pg_isready >/dev/null 2>&1; then
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -q; then
    ok "Postgres on ${DB_HOST}:${DB_PORT}"
  else
    fail "Postgres não responde em ${DB_HOST}:${DB_PORT}. Suba seu Postgres no host antes (brew services start postgresql ou systemctl start postgresql)."
    exit 1
  fi
else
  # Fallback: try a TCP connect
  if (echo > /dev/tcp/${DB_HOST}/${DB_PORT}) 2>/dev/null; then
    ok "Postgres on ${DB_HOST}:${DB_PORT} (tcp probe)"
  else
    fail "Postgres não responde em ${DB_HOST}:${DB_PORT}."
    exit 1
  fi
fi

# Redis on host
if command -v redis-cli >/dev/null 2>&1; then
  if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping >/dev/null 2>&1; then
    ok "Redis on ${REDIS_HOST}:${REDIS_PORT}"
  else
    fail "Redis não responde em ${REDIS_HOST}:${REDIS_PORT}. Suba seu Redis no host (brew services start redis ou systemctl start redis-server)."
    exit 1
  fi
else
  if (echo > /dev/tcp/${REDIS_HOST}/${REDIS_PORT}) 2>/dev/null; then
    ok "Redis on ${REDIS_HOST}:${REDIS_PORT} (tcp probe)"
  else
    fail "Redis não responde em ${REDIS_HOST}:${REDIS_PORT}."
    exit 1
  fi
fi

# ── 2. .env bootstrap ───────────────────────────────────────────────────────

step ".env"

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$SCRIPT_DIR/.env.example" ]]; then
    cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"
    warn ".env criado a partir de .env.example — preencha os secrets antes de testar OAuth/attest"
  else
    fail ".env não encontrado e .env.example também não existe."
    exit 1
  fi
else
  ok ".env presente"
fi

# Warn (não falha) sobre secrets vazios — usuário pode ignorar se só quer browsar a SPA
for var in GITHUB_OAUTH_CLIENT_ID GITHUB_OAUTH_CLIENT_SECRET BEHELD_PLATFORM_PRIVATE_KEY; do
  val=$(grep -E "^${var}=" "$ENV_FILE" | tail -1 | cut -d= -f2-)
  if [[ -z "$val" ]]; then
    warn "${var} vazio em .env — fluxos que dependem desse var vão falhar"
  fi
done

# ── 3. docker compose up ────────────────────────────────────────────────────

step "docker compose up --build -d"
docker compose up --build -d
echo

# ── 4. Schema setup (MUST run before /up — Rails dev blocks every request
#       with ActiveRecord::PendingMigrationError until migrations are applied)
#
# Both db:create and db:migrate are idempotent:
#   - db:create on an existing DB → "already exists" (exit 0)
#   - db:migrate with nothing pending → no-op (exit 0)
# So we run unconditionally and avoid the chicken-and-egg of probing /up
# through a pending-migration guard.

step "Esperando backend container subir"
for i in $(seq 1 30); do
  state=$(docker compose ps --format json backend 2>/dev/null | grep -o '"State":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [[ "$state" == "running" ]]; then
    ok "Container backend running"
    break
  fi
  if [[ $i -eq 30 ]]; then
    fail "Container backend não entrou em 'running' em 30s. Logs:"
    docker compose logs --tail 30 backend
    exit 1
  fi
  sleep 1
done

step "Schema: db:create + db:migrate (idempotente)"
if docker compose exec -T backend bin/rails db:create db:migrate 2>&1 | tail -20; then
  ok "Schema em dia"
else
  fail "Falha em db:create/db:migrate — veja a saída acima"
  exit 1
fi

# ── 5. Wait for backend health (now that migrations are applied) ─────────────

BACKEND_PORT=$(grep -E '^BACKEND_PORT=' "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2)
BACKEND_PORT="${BACKEND_PORT:-3000}"
HEALTH_URL="http://localhost:${BACKEND_PORT}/up"

step "Aguardando backend healthy (${HEALTH_URL})"
for i in $(seq 1 60); do
  if curl -fsS -m 2 "$HEALTH_URL" >/dev/null 2>&1; then
    ok "Backend healthy"
    break
  fi
  if [[ $i -eq 60 ]]; then
    fail "Backend não respondeu /up em 60s. Logs:"
    docker compose logs --tail 40 backend
    exit 1
  fi
  sleep 1
done

# ── 6. Resumo ────────────────────────────────────────────────────────────────

FRONTEND_PORT=$(grep -E '^FRONTEND_PORT=' "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2)
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

echo
echo "${BOLD}beheld web — dev${RESET}"
echo "  ${DIM}SPA${RESET}        http://localhost:${FRONTEND_PORT}"
echo "  ${DIM}API${RESET}        http://localhost:${BACKEND_PORT}"
echo "  ${DIM}Health${RESET}     http://localhost:${BACKEND_PORT}/up"
echo
echo "  ${DIM}Logs${RESET}       docker compose logs -f"
echo "  ${DIM}RSpec${RESET}      docker compose exec backend bundle exec rspec"
echo "  ${DIM}Stop${RESET}       docker compose down            ${DIM}# preserva volumes${RESET}"
echo "                docker compose down -v         ${DIM}# apaga gems cache + node_modules${RESET}"
echo

if [[ "${1:-}" == "--logs" ]]; then
  docker compose logs -f
fi
