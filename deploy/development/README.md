# beheld — development (Docker)

Containerizes the Rails 7.2 API at [`../../source/backend`](../../source/backend) **and** the React + Vite SPA at [`../../source/frontend`](../../source/frontend). Connects to **Postgres** and **Redis** running on the host machine (not in containers).

## Prerequisites

- Docker Desktop (macOS / Windows) or Docker 20.10+ on Linux
- Postgres running on the host, listening on `localhost:5432`
- Redis running on the host, listening on `localhost:6379`
- A Postgres role that can create databases (default expects user `postgres` with password `postgres`)

## Quick start

```sh
# 1. Configure local env
cp .env.example .env
# (edit .env if your host Postgres/Redis credentials differ)

# 2. Build the dev images and start both services
docker compose up --build

# 3. First time only — create the development database
docker compose exec backend bin/rails db:create db:migrate

# 4. Health checks
curl http://localhost:3000/up         # Rails API
open http://localhost:5173            # React SPA (home)
```

Stop with `Ctrl+C`. Remove containers and volumes:

```sh
docker compose down -v
```

## Endpoints

The backend serves the Phase 5 portal API for signed `.dpbundle` snapshots:

| Method | Path | Returns | Used by |
|---|---|---|---|
| `GET`  | `/up` | health probe | infrastructure / monitors |
| `POST` | `/bundles` | `{ id, url, ttl_days, created_at, deduplicated? }`; sets `X-TTL` header | `beheld snapshot --share` |
| `GET`  | `/v/:id` | full bundle JSON (incl. signature + public_key for client-side verification) | browsers, `beheld verify` |
| `GET`  | `/v/:id/summary` | sanitized JSON (scores + signals + metadata, no proof fields) | OG previews, dashboards |
| `GET`  | `/v/:id/badge.svg` | shields.io-style SVG badge with overall score | README / LinkedIn embeds |

Bundles uploaded without an account expire after 30 days (see `Bundle::DEFAULT_TTL_DAYS`). Re-uploading the same bundle hash is idempotent — `POST /bundles` returns the existing record with `deduplicated: true`.

Smoke test the full pipeline (engine generates → CLI signs → portal stores):

```sh
# from the beheld worktree:
BEHELD_PORTAL_URL=http://localhost:3000 beheld snapshot --share
```

## How it works

| File | Role |
|---|---|
| [`Dockerfile.dev`](./Dockerfile.dev) | Thin Ruby 3.3 image with system deps. No app code COPYed in — source is bind-mounted at runtime. |
| [`entrypoint.dev.sh`](./entrypoint.dev.sh) | On each backend container start: runs `bundle install` if `Gemfile.lock` is missing or stale, then execs `CMD`. |
| [`Dockerfile.frontend.dev`](./Dockerfile.frontend.dev) | Thin Bun 1.x image. Source bind-mounted; `node_modules` in a named volume. |
| [`entrypoint.frontend.sh`](./entrypoint.frontend.sh) | On each frontend container start: runs `bun install` if `node_modules` is missing, then execs `CMD` (Vite dev server). |
| [`docker-compose.yml`](./docker-compose.yml) | Orchestrates **backend** (port 3000) and **frontend** (port 5173). Bind-mounts `../../source/*` → `/app` per service. Maps `host.docker.internal` to the host gateway so backend can reach host Postgres/Redis (Docker Desktop already does this). |

### Why bind-mount instead of `COPY`?

Code reloads instantly without rebuilding the image. The `bundle-cache` volume keeps installed gems between restarts, so only the first `up` is slow.

## Environment variables (see `.env.example`)

| Var | Default | What |
|---|---|---|
| `BACKEND_PORT` | `3000` | Host port for the Rails server |
| `FRONTEND_PORT` | `5173` | Host port for the Vite dev server |
| `VITE_API_URL` | `http://localhost:3000` | Base URL the SPA hits at runtime (browser → host) |
| `DB_HOST` | `host.docker.internal` | Where the container looks for Postgres |
| `DB_PORT` | `5432` | Postgres port on the host |
| `DB_USER` / `DB_PASSWORD` | `postgres` / `postgres` | Override if your host uses different credentials |
| `DB_NAME` | `beheld_backend_development` | Created by `rails db:create` |
| `REDIS_URL` | `redis://host.docker.internal:6379/1` | Database 1 reserved for Rails cache |
| `CORS_ORIGINS` | `*` | Comma-separated allow list; tighten in staging/prod |

## Common tasks

```sh
# Open a Rails console
docker compose exec backend bin/rails console

# Run a generator
docker compose exec backend bin/rails generate model User name:string

# Typecheck the frontend
docker compose exec frontend bun run typecheck

# Add a frontend dep
docker compose exec frontend bun add lodash

# Tail logs of a specific service
docker compose logs -f backend
docker compose logs -f frontend

# Force-rebuild a service's image
docker compose build --no-cache frontend
```

### Frontend pages

| Route | What |
|---|---|
| `/` | Landing — explains the product, links to verify |
| `/v/:id` | Public profile viewer for an uploaded bundle. Fetches `/v/:id` JSON from the backend, then re-verifies the Ed25519 signature locally via `crypto.subtle` before displaying scores. |
| `/verify` | Drag-and-drop a `.dpbundle` and verify it 100% offline (no upload). Useful for skeptics. |

## Troubleshooting host connectivity

If the container can't reach Postgres/Redis, verify they are listening on a host interface reachable from Docker — not only `127.0.0.1` on macOS:

```sh
# On the host
lsof -nP -iTCP:5432 -sTCP:LISTEN
lsof -nP -iTCP:6379 -sTCP:LISTEN
```

On macOS, Postgres installed via `brew install postgresql` typically listens on `*` by default. On Linux, you may need to edit `postgresql.conf` (`listen_addresses = '*'`) and `pg_hba.conf` to allow connections from `172.17.0.0/16` (the default Docker bridge subnet).
