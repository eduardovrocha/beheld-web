# Subdivisões — web

Tabela mestra. Detalhes em `subdivisions/<nome>.md`.

| # | Nome | Caminho | Stack | Propósito | Estado |
|---|---|---|---|---|---|
| 1 | [backend](subdivisions/backend.md) | `source/backend` | Rails 7.2, Postgres, Redis, Sidekiq | API do portal: upload de bundles, perfis públicos, dashboards dev/empresa, vagas, matching, atestações GitHub | Implementado |
| 2 | [frontend](subdivisions/frontend.md) | `source/frontend` | React 18, Vite, Tailwind | SPA do portal: landing, retrato público com verificação no browser, verificador offline, dashboards dev/empresa | Implementado |
| 3 | [deploy](subdivisions/deploy.md) | `deploy` | Docker Compose, Caddy | Orquestração dev (compose + Mailpit) e prod (compose + Sidekiq + Caddy/TLS em VPS) | Implementado |

## Dependências

```
frontend ──HTTP fetch / SSR fallback──▶ backend (API JSON; verificação Ed25519 no browser)
backend  ──serve SSR + JSON──▶ consumido por frontend e pelo CLI do repo `daemon`
deploy   ──orquestra──▶ backend + frontend (+ Sidekiq, Caddy em prod)
```

Dependência externa ao repo: o **CLI** (repo `daemon`) publica bundles via `POST /api/v1/bundles`
e autentica via challenge/response Ed25519.

> Histórico: existiu um 4º componente, `source/dashboard` ("Signal.Dev", protótipo Lovable com
> dados mock, repo git próprio `engineer-echo-pro`), **removido em 2026-06-09** (ver `CHANGELOG.md`).
