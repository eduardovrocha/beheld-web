# Subdivisão: backend

- **Caminho**: `source/backend`
- **Stack**: Ruby 3.3, Rails 7.2.3 API-only, Postgres, Redis, Sidekiq 7.3, ed25519, rack-attack,
  rack-cors, dotenv-rails. Testes: RSpec + FactoryBot + Faker + Capybara + WebMock + mock_redis.
- **Propósito**: API do portal. Recebe bundles assinados do CLI, hospeda perfis públicos com
  verificação cripto, e serve os dashboards do dev e da empresa, incluindo vagas e matching.

## Topologia interna

Duas superfícies coexistem:
1. **SSR** — controllers na raiz (`dashboard`, `directory`, `verify`, `companies`,
   `sessions/company_sessions`) com views ERB, fallback p/ quando JS falha.
2. **JSON API** sob `namespace :api/v1` — consumida pelo SPA `frontend` e pelo CLI.

## Models (`app/models/` — 18; ver `DOMAIN.md` para campos)

`account`, `attestation`, `auth_challenge`, `bundle`, `cli_doc`, `company`, `dev_session`,
`install`, `magic_link`, `message`, `position`, `position_match`, `position_priority`,
`position_threshold`, `saved_dev`, `snapshot`, `verification`, `application_record`.

## Controllers (`app/controllers/` + `api/v1/`)

- **Públicos**: `profiles` (`/v/:slug`), `v`/`verify_controller` (summary/badge), `snapshots`
  (`POST /bundles` legacy), `installs` (counter B3H31D), `versions` (`/api/version`), `platform_keys`.
- **Identidade**: `auth_controller` (GitHub OAuth start/callback), `attestations` (claim/verify/revoke).
- **API v1**: `auth` (challenge/verify Ed25519), `bundles`, `companies`, `sessions`, `dashboard`,
  `directory`, `contacts`, `docs/cli`, `dev/{interest_count,bundle_health}`,
  `company/{dashboard,messages,positions,saved_devs}`.

## Services (`app/services/`)

`attestation_verifier`, `github_api_client`, `github_oauth`, `oauth_state_store`,
`platform_key_signer`, `positions/` (matcher — `positions/matcher.rb`), `docs_cli/`.

## Jobs assíncronos (Sidekiq — `app/jobs/`)

`notification_job`, `respond_contact_job`, `webhook_job`, `expired_position_notification_job`.
Mailers: `company_mailer`, `contact_mailer`, `notification_mailer`, `position_mailer`.

## Entradas e saídas

- **Entrada**: `POST /api/v1/bundles` (CLI, assinado); magic-link de empresa; OAuth GitHub callback;
  `POST /api/install/register` (telemetria de instalação, payload imutável sem PII).
- **Saída**: JSON p/ SPA; HTML SSR; e-mails transacionais; webhooks de notificação; badge SVG.

## Dependências

- **Quem depende**: `frontend` (fetch JSON + SSR fallback), `cli` do repo `daemon` (publica/autentica).
- **Externas**: Postgres, Redis (cache + Sidekiq), GitHub OAuth/API, SMTP (prod GoDaddy / dev
  Mailpit), assinatura Ed25519 com a platform key.

## Estado de implementação: **Implementado**

Evidência: 58 specs (`spec/{models,requests,services,jobs,mailers,factories}`), 28 migrations
(mais recente `20260608160000_create_cli_docs`), schema completo em `db/schema.rb`. Matching de
vagas implementado (`positions/matcher.rb`, modelos `position_*`).

### Débito visível

- `app/controllers/api/v1/company/positions_controller.rb:292` — notificação de match ainda **inline**;
  migração para Sidekiq (`PerformLater`) pendente.
- `config/master.key` e `config/credentials.yml.enc` presentes no working tree — ver `CONFIG.md`.
- README do backend é o boilerplate default do Rails — ver `source/backend/CLAUDE.md` para o real.
