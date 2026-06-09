# Estado de Implementação — web

Estados: **implementado** | **parcial** | **esqueleto** | **placeholder**.

## Por subdivisão

| Subdivisão | Estado | Evidência |
|---|---|---|
| backend | implementado | ~30 controllers, 18 models, Sidekiq, OAuth, 28 migrations, 58 specs |
| frontend | implementado | 3 dashboards + landing + verificador, 41 testes |
| deploy | implementado | compose dev+prod, Caddy, scripts SSH/deploy |

## Funcionalidades — granular

| Funcionalidade | Estado | Nota / evidência |
|---|---|---|
| Verificação cripto no browser (portal) | implementado | `frontend/src/lib/attestationVerify.ts` + `verify.ts` |
| Publicação de bundle no portal | implementado | `bundles_controller` + CLI |
| Perfil público `/v/:slug` | implementado | `profiles_controller`, rotas, specs |
| Atestação de identidade GitHub | implementado | OAuth + `attestations` claim/verify/revoke + specs |
| Dashboard do dev (SSR + SPA) | implementado | `dashboard_controller`, rotas frontend |
| Dashboard da empresa (SSR + SPA) | implementado | `company/*` controllers + componentes |
| Vagas + critérios + matching | implementado | `positions/matcher.rb`, models `position_*`, specs |
| Notificação de match síncrona → Sidekiq | **parcial** | ainda inline (`positions_controller.rb:292`) |
| Diretório de devs (opt-in) | implementado | `directory_controller` + filtros |
| Docs da CLI versionadas | implementado | `cli_docs` model + `docs:cli:ingest` rake + endpoints |
| Telemetria de instalação (B3H31D) | implementado | `installs_controller`, rate-limited |
| Deploy produção (VPS + Caddy + Sidekiq) | implementado | `deploy/production/*` |

## Coexistências / dívida estrutural

- **bundle vs snapshot**: dois modelos coexistem pós-split de dados. `snapshot` (legacy, `short_id`)
  e `bundle` (account-bound, `url_slug`). Rotas legacy `POST /bundles` → `snapshots#create`.
- **Lógica compartilhada por cópia**: `frontend/src/lib/cli-shared/` e `canonical` duplicam código
  do CLI (repo `daemon`; wire format). Sincronização manual.
- **`source/backend/README.md`** é boilerplate Rails — o guia real é `source/backend/CLAUDE.md`.
