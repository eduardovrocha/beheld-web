# devprofile / web

Portal companion repo for the [devprofile](https://github.com/eduardovrocha/beheld) CLI/engine. Hosts the public profile pages and signed-snapshot upload endpoint behind `devprofile.app`.

| Path | What |
|---|---|
| [`source/backend`](./source/backend) | Rails 7.2 API. Receives `POST /bundles` (upload), serves `GET /v/:id` (raw bundle), `GET /v/:id/summary` (sanitized view), `GET /v/:id/badge.svg` (embeddable badge). |
| [`source/frontend`](./source/frontend) | Vite + React 18 + TypeScript + Tailwind SPA. Renders `/v/:id` with browser-side Ed25519 verification (`crypto.subtle`) and a drag-and-drop offline verifier at `/verify`. |
| [`deploy/development`](./deploy/development) | Docker Compose orchestrating both services in dev. Connects to **Postgres and Redis on the host** (not in containers). |

## Quick start

```sh
cd deploy/development
cp .env.example .env
docker compose up --build
docker compose exec backend bin/rails db:create db:migrate   # first time only
open http://localhost:5173                                    # SPA
curl http://localhost:3000/up                                 # API health
```

Detailed instructions, env vars, and troubleshooting in [`deploy/development/README.md`](./deploy/development/README.md).

## How this fits with the CLI

The CLI in the [parent devprofile repo](https://github.com/eduardovrocha/beheld) generates signed `.dpbundle` files. When invoked with `devprofile snapshot --share`, it `POST`s to this backend's `/bundles`, gets back a short URL, and renders a QR. Anyone with the URL can hit `/v/:id` in this frontend, which:

1. Fetches the bundle JSON via the API.
2. Re-computes the SHA-256 of the canonical payload locally.
3. Verifies the Ed25519 signature with the public key embedded in the bundle — never trusts the server.

The bundle wire format is locked across three runtimes (Python engine, Bun CLI, browser SPA). Schema changes require bumping `BUNDLE_VERSION` in all three.

## Architecture

```
devprofile CLI ──POST /bundles──▶ Rails API ──persists──▶ Postgres
                                       │
                                       └──serves──▶  GET /v/:id
                                                       │
                                                       ▼
                                              React SPA (browser)
                                                       │
                                                       └─▶ crypto.subtle.verify(Ed25519)
                                                              ✓ shows scores + signals
                                                              ✗ shows tampering reason
```
