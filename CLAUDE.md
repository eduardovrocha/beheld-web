# CLAUDE.md — web (portal Beheld)

Repo `beheld-web`. Portal de `beheld.dev`: hospeda os retratos verificáveis de devs, com verificação
criptográfica feita **no navegador**. Companion do repo irmão **`daemon`** (CLI + engine + MCP),
que gera os bundles assinados. Análise estrutural detalhada em [`.knowledge/`](.knowledge/INDEX.md).

## Estrutura

```
web/
├── source/
│   ├── backend/   Rails 7.2 API-only (Ruby 3.3) — ver source/backend/CLAUDE.md
│   └── frontend/  React 18 + Vite SPA           — ver source/frontend/CLAUDE.md
├── deploy/        Docker Compose (dev + prod) + Caddy
└── docs/          specs de release
```

Guias específicos e densos vivem nos sub-CLAUDE.md:
- **`source/backend/CLAUDE.md`** — superfícies SSR+JSON, auth Ed25519/magic-link, matcher, domínio.
- **`source/frontend/CLAUDE.md`** — verificação no browser, roteamento, i18n, libs.

## Comandos

```sh
# Stack completa (dev) — Postgres + Redis rodam no HOST, não em container
cd deploy/development && docker compose up --build
docker compose exec backend bin/rails db:create db:migrate   # primeira vez
# SPA em :5173, API em :3000, Mailpit em :8025

# Backend isolado (de source/backend)
bundle exec rspec ; bin/rubocop ; bin/brakeman --no-pager

# Frontend isolado (de source/frontend)
npm run dev ; npm test ; npm run typecheck
```

## Princípios que cruzam o repo

- **Verificação no cliente é inviolável**: o retrato público re-computa SHA-256 + verifica Ed25519
  com `crypto.subtle`. Nunca delegue isso ao servidor.
- **Wire format do bundle é travado em 3 runtimes** (engine Python e CLI Bun no repo `daemon`;
  browser aqui). `frontend/src/lib/cli-shared/` e `canonical` são **cópias** do CLI — sincronizar
  manualmente. A estrutura do `bundle_data` nasce no `daemon`.
- **Duas superfícies no backend** (SSR + JSON API `/api/v1`) coexistem — altere as duas juntas.
- **Sem senha**: dev = chave Ed25519 (challenge/response); empresa = magic link (cookie assinado).
- **Jobs assíncronos** via Sidekiq (notificações, webhooks, contato, expiração de vaga).

## Gotchas

- **Não commitar segredos**: `deploy/development/.env` (credenciais dev reais, gitignored),
  `source/backend/config/master.key`, `deploy/keys/*` (chaves SSH). Ver `.knowledge/CONFIG.md`.
- **`PORTAL_PUBLIC_URL` é obrigatória** — Rails lança `KeyError` sem ela.
- **CI só roda rubocop + brakeman** (`source/backend/.github/workflows/ci.yml`) — nenhum job de
  testes. Rode `rspec` / `npm test` localmente antes de concluir.
- **`bundle` vs `snapshot`** coexistem (split legacy) — não unifique sem ler `.knowledge/OPEN_QUESTIONS.md`.
- O lado local (telemetria, scoring, geração do bundle) **não está aqui** — está no repo `daemon`.
