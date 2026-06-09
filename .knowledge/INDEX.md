# Base de Conhecimento — web (portal Beheld)

Repositório `beheld-web` (`git@github.com:eduardovrocha/beheld-web.git`). Portal companion do
repositório irmão **`daemon`** (`beheld`, CLI + engine + MCP). Gerada por análise estrutural do
código em **2026-06-09**.

## Navegação

- **[OVERVIEW.md](OVERVIEW.md)** — o que o portal é, stack, topologia, estado geral.
- **[SUBDIVISIONS.md](SUBDIVISIONS.md)** — tabela mestra das subdivisões do web + dependências.
- **[DOMAIN.md](DOMAIN.md)** — entidades de domínio (models Rails) e fluxos principais.
- **[CONFIG.md](CONFIG.md)** — variáveis de ambiente, segredos, ambientes.
- **[STATE.md](STATE.md)** — tabela honesta: implementado / parcial / placeholder.
- **[OPEN_QUESTIONS.md](OPEN_QUESTIONS.md)** — o que exige decisão humana.
- **[CHANGELOG.md](CHANGELOG.md)** — histórico desta base.

## Subdivisões

| # | Subdivisão | Arquivo |
|---|---|---|
| 1 | backend | [subdivisions/backend.md](subdivisions/backend.md) |
| 2 | frontend | [subdivisions/frontend.md](subdivisions/frontend.md) |
| 3 | deploy | [subdivisions/deploy.md](subdivisions/deploy.md) |

## Mapa

```
web/   (repo beheld-web)
├── source/
│   ├── backend/   (1)  Rails 7.2 API (Postgres, Redis, Sidekiq)  — tem CLAUDE.md próprio
│   └── frontend/  (2)  React 18 + Vite SPA (produção)            — tem CLAUDE.md próprio
└── deploy/        (3)  Docker Compose + Caddy (dev + prod)
```

> O lado local do produto (captura de telemetria, scoring, geração do bundle assinado) vive no
> repo **`daemon`** — ver `../../daemon/.knowledge/`.
