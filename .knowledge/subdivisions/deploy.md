# Subdivisão: deploy

- **Caminho**: `deploy`
- **Stack**: Docker Compose, Caddy 2 (reverse proxy + TLS), shell scripts, SSH.
- **Propósito**: orquestrar backend + frontend em dev e prod.

## Ambientes

### `deploy/development`
- `docker-compose.yml` — projeto `beheld`; serviços `backend` (Dockerfile.dev) e `frontend`
  (Dockerfile.frontend.dev).
- **Postgres e Redis rodam no HOST**, não em containers — via `host.docker.internal:host-gateway`.
- E-mail via **Mailpit** no host (`host.docker.internal:1025`, UI :8025), sem auth.
- `entrypoint.dev.sh`, `entrypoint.frontend.sh`, `start.sh`, `generate-dev-platform-key.sh`.
- **`.env` presente e populado** (gitignored via `deploy/development/.gitignore`) — ver `CONFIG.md`.

### `deploy/production`
- `docker-compose.yml` — `network_mode: host`; serviços `backend`, `sidekiq`, `caddy`.
- Postgres/Redis **nativos no host** (127.0.0.1). Frontend buildado em `frontend/dist`, servido
  pelo Caddy como estático.
- Segredos fora do repo, em `/etc/beheld/{app.env,postgres.env}` (perms 600), via `env_file`.
- `sidekiq` reusa a imagem `beheld-backend:prod`, comando `bundle exec sidekiq -c 5`.
- `Caddyfile` + `deploy.sh`. Healthcheck do backend em `http://127.0.0.1:3000/up`.
- Alvo: VPS (`beheld.dev`), DNS Hostinger, SSL no Caddy (ver `docs/release-0.1-spec.md`).

## `deploy/keys/` — material sensível no working tree

`beheld_deploy` (chave SSH privada), `beheld_deploy.pub`, `vps-bootstrap.pem`, `bootstrap-ssh.sh`,
`connect-ssh.sh`. Há `.gitignore` local. Ver `CONFIG.md` / `OPEN_QUESTIONS.md`.

## Dependências

- **Orquestra**: `backend`, `frontend` (e `sidekiq` em prod).
- **Externas**: Docker engine, Postgres/Redis do host, VPS, DNS, Let's Encrypt (via Caddy).

## Estado de implementação: **Implementado**

Dev e prod com compose completos, entrypoints, Caddyfile e scripts de deploy/SSH.
