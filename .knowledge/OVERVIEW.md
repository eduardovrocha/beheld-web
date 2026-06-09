# web — Visão Geral

> Repo `beheld-web`. Estado real derivado do código em 2026-06-09.

## O que é

Portal de `beheld.dev`: hospeda os **retratos técnicos verificáveis** de desenvolvedores. Recebe
bundles assinados (Ed25519) gerados pelo CLI (repo `daemon`), serve a página pública `/v/:slug`
com verificação criptográfica feita **no navegador** (nunca confia no servidor), e oferece os
dashboards do dev e da empresa — incluindo diretório, vagas com critérios objetivos e matching.

Recrutadores nunca veem e-mail/telefone do dev até este responder.

## Topologia

Repo independente (`web/`), companion do repo `daemon`. Contém:

```
web/
├── source/
│   ├── backend/   Rails 7.2 API-only (Ruby 3.3)
│   └── frontend/  React 18 + Vite SPA (produção)
├── deploy/        Docker Compose (dev + prod) + Caddy
└── docs/          specs de release (0.1)
```

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Ruby 3.3, Rails 7.2, Postgres, Redis, Sidekiq 7.3, ed25519, rack-attack, rack-cors |
| Frontend | React 18.3, Vite 5, TypeScript 5.5, Tailwind 3, react-router 6, vitest |
| Infra | Docker Compose, Caddy 2 (reverse proxy/TLS), VPS (`beheld.dev`) |

## Estado geral

- **backend** — implementado. ~30 controllers, 18 models, Sidekiq jobs, OAuth GitHub, atestações, matching (58 specs).
- **frontend** — implementado. Portal público + dashboards dev/empresa + verificador offline (41 testes).
- **deploy** — implementado (dev + prod compose, Caddy, scripts de deploy/SSH).

## Integração com o repo `daemon`

O binário `beheld` (repo `daemon`) gera o `.dpbundle`, publica via `POST /api/v1/bundles`, e abre
o navegador no retrato. **O wire format do bundle é travado em 3 runtimes** (engine Python e CLI
Bun no `daemon`; browser SPA aqui). Mudá-lo exige bump de versão nos três. `frontend/src/lib/
cli-shared/` e `canonical` duplicam lógica do CLI **por cópia** — sincronização manual.

Ver `STATE.md` (tabela honesta) e `OPEN_QUESTIONS.md` (decisões pendentes).
