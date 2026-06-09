# CLAUDE.md — backend

Rails 7.2 API-only (Ruby 3.3) do portal Beheld. Contexto do produto inteiro na raiz do repo
(`/CLAUDE.md`) e em `/.knowledge/`. Spec narrativo: `../../docs/release-0.1-spec.md`.

## Papel

Recebe bundles assinados do CLI, hospeda perfis públicos com verificação cripto (feita no
**browser**, não aqui), e serve os dashboards do dev e da empresa — incluindo vagas e matching.

## Comandos

```sh
bundle exec rspec                 # testes (model + request + service + job + mailer specs)
bin/rubocop                       # estilo (rubocop-rails-omakase) — roda no CI
bin/brakeman --no-pager           # scan de segurança — roda no CI
bin/rails db:create db:migrate    # primeira vez
bin/rails s                       # servidor (porta 3000)
bin/rails docs:cli:ingest         # popula cli_docs a partir das docs da CLI
```

Postgres + Redis rodam **no host** (não em container). Em dev, e-mail cai no Mailpit. Sidekiq
processa os jobs assíncronos (em prod é um serviço próprio no compose).

## Duas superfícies que COEXISTEM

Toda funcionalidade voltada a usuário existe em dois lugares — **mantenha em sync ao alterar**:

1. **SSR** — controllers na raiz de `app/controllers/` + views ERB (`app/views/`). Fallback para
   quando o JavaScript do SPA falha (clientes de e-mail, no-JS).
2. **JSON API** — sob `app/controllers/api/v1/`, namespace `:api/v1` (`config/routes.rb`).
   Consumida pelo SPA `frontend` e pelo CLI.

Ex.: dashboard do dev existe em `dashboard_controller.rb` (SSR) **e** `api/v1/dashboard_controller.rb`
(JSON). Mesma regra para directory, contacts, sessions/company.

## Autenticação — dois mundos, sem senha

| Ator | Mecanismo | Concern | Como |
|---|---|---|---|
| **Dev** | Ed25519 challenge/response | `DevAuthenticated` | `auth#challenge`/`verify` emitem `DevSession.token`; cliente manda `Authorization: Bearer <token>` (cookie `_beheld_session` é fallback) |
| **Empresa** | Magic link | `CompanyAuthenticated` | `sessions/company` envia link por e-mail; `#verify` seta cookie assinado `_beheld_company_session` |

- Concerns em `app/controllers/concerns/`. A versão SSR redireciona (HTML); as **base controllers
  JSON** (`api/v1/company/base_controller.rb`, `api/v1/dev/base_controller.rb`) sobrescrevem para
  responder **401 JSON** `{ ok: false, error: ... }` em vez de redirect.
- `account.fingerprint` (unique) deriva da pubkey Ed25519 do dev — é a identidade. Não há tabela de senha.
- `LocaleSelectable` (`around_action`) seleciona locale por `?locale=` → `Accept-Language` →
  default `pt-BR`. Lê só a query string, nunca `params[:locale]` (evitaria parse de corpo JSON
  malformado proposital).

## Domínio — pontos não óbvios

- **`bundle` vs `snapshot` coexistem** (split de dados legacy). `snapshot` = legacy por `short_id`;
  `bundle` = account-bound por `url_slug`. A rota legacy `POST /bundles` aponta para
  `snapshots#create` por retrocompat do CLI. Não unifique sem ler `.knowledge/OPEN_QUESTIONS.md`.
- **Wire format do bundle** é lido estruturalmente. Os dados ficam em `bundle.bundle_data`
  (jsonb). A tolerância a esquemas core/enrichment vs legacy l1/l2 vive em **`BundleSignals.from`** —
  mantenha os parsers de schema lá, não espalhe pelos controllers/serviços.
- **Matching de vaga** (`app/services/positions/matcher.rb`): `Positions::Matcher.calculate!`
  filtra accounts opt-in pelos `position_threshold`, pontua pelos `position_priority`, e persiste
  `position_match`. **`position_matches` é um cache por vaga** — cada cálculo trunca e reinsere;
  nunca trate como histórico imutável. Score é clampado a `[0,100]`; `near_miss` = falhou exatamente
  um threshold dentro da margem de 20%.
- **Notificações/contato/webhooks/expiração de vaga** vão para Sidekiq (`app/jobs/`). Exceção
  conhecida: notificação de match ainda é **inline** em `api/v1/company/positions_controller.rb:292`
  (migração para `PerformLater` pendente).
- **`install`** (telemetria de instalação) é cláusula pétrea: payload imutável `{ id:uuid, os, version }`,
  **sem PII**. Rate-limited via rack-attack (`config/initializers/rack_attack.rb`, default 10/3600s).
- Comentários referenciam fases/specs (Phase 5 / F5.6, PP7, R1.3, F_UNINSTALL). Decodifique em
  `../../docs/release-0.1-spec.md` quando precisar do "porquê".

## Convenções

- Respostas JSON da API seguem `{ ok: bool, ... }` / `{ ok: false, error: "..." }`.
- CORS (`config/initializers/cors.rb`): leituras públicas usam origens wildcard; fluxos com cookie
  (sessão de empresa) usam origens explícitas. Não afrouxe o segundo grupo.
- i18n em `config/locales/{en,es,pt-BR}.yml`. Strings de usuário via `I18n.t`.
- Siga `rubocop-rails-omakase`; rode brakeman antes de afirmar que algo está pronto.

## Segredos (não commitar)

`config/master.key` (descriptografa `credentials.yml.enc`) está no working tree. Segredos de runtime
(`DB_PASSWORD`, `SMTP_PASSWORD`, `GITHUB_OAUTH_CLIENT_SECRET`, `BEHELD_PLATFORM_PRIVATE_KEY`) vêm de
env — em prod via `/etc/beheld/*.env`. `PORTAL_PUBLIC_URL` é **obrigatória** (Rails lança `KeyError`
se ausente). Detalhe completo em `/.knowledge/CONFIG.md`.

## Testes

RSpec + FactoryBot + Faker; WebMock stub para GitHub OAuth; mock_redis para `OauthStateStore`;
Capybara (rack_test) para a página de perfil público. 58 specs em `spec/{models,requests,services,
jobs,mailers,factories}`. **O CI não roda os testes** (só rubocop + brakeman) — rode `rspec`
localmente antes de concluir.
