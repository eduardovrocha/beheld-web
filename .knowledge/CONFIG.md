# Configuração e Ambiente — web

Variáveis derivadas do código.

## Backend (Rails) — `.env.example`, `docker-compose.yml`, initializers

| Variável | Onde é lida | Tipo | Notas |
|---|---|---|---|
| `PORTAL_PUBLIC_URL` | mailers, url helpers | **obrigatória** | Rails lança `KeyError` se ausente |
| `MAILER_DEFAULT_HOST` / `MAILER_DEFAULT_PROTOCOL` | mailers | config | casam com PORTAL_PUBLIC_URL |
| `BEHELD_MAIL_FROM` / `MAIL_FROM` | `application_mailer` | config | remetente `no-reply@` |
| `SMTP_HOST/PORT/DOMAIN/USERNAME/PASSWORD/AUTHENTICATION/TLS` | config SMTP | **segredo** | prod GoDaddy :465; dev Mailpit :1025 |
| `BEHELD_FORCE_SSL` | force_ssl/HSTS | config | "false" só na janela pré-TLS |
| `RAILS_LOG_LEVEL` | logger | config | |
| `DB_HOST/PORT/USER/PASSWORD/NAME/NAME_TEST` | `database.yml` / compose | **segredo** | prod em `/etc/beheld/postgres.env` |
| `REDIS_URL` | cache + Sidekiq | config | |
| `CORS_ORIGINS` | `initializers/cors.rb` | config | `*` só em dev; prod usa origens explícitas |
| `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` | `github_oauth` | **segredo** | |
| `BEHELD_PLATFORM_KEY_ID` / `BEHELD_PLATFORM_PRIVATE_KEY` | `platform_key_signer` | **segredo** | seed Ed25519 base64 (32 bytes); nunca sai do host |
| `INSTALL_REGISTER_RATE_LIMIT` | `rack_attack.rb:17` | config | default `10/3600` |
| `BEHELD_INSTALL_SCRIPT_URL` | Caddyfile (prod) | config | interpolado pelo Caddy no boot |
| `RAILS_ENV`, `BINDING`, `PORT`, `RAILS_LOG_TO_STDOUT`, `RAILS_SERVE_STATIC_FILES` | compose/Rails | config | |

## Frontend (Vite) — `.env.example`

| Variável | Notas |
|---|---|
| `VITE_API_URL` | URL do backend (browser). Dev `http://localhost:3000`; prod `/api` same-origin atrás do Caddy |
| `VITE_API_TARGET` | target do proxy dev do Vite (`vite.config.ts`) |

Só variáveis com prefixo `VITE_` ficam expostas no bundle do browser — **não pôr segredo aqui**.

## Distinção de ambientes

- **Backend**: `RAILS_ENV` (development/test/production) + `config/environments/*.rb`.
- **Frontend**: arquivos Vite `.env.development` / `.env.production`.
- **Deploy**: pastas separadas `deploy/development` (Postgres/Redis no host, Mailpit) e
  `deploy/production` (`network_mode: host`, secrets em `/etc/beheld/`, Caddy/TLS).

## ⚠️ Material sensível presente no working tree

1. **`deploy/development/.env`** — presente e **populado** (gitignored): `DB_PASSWORD`,
   `BEHELD_PLATFORM_PRIVATE_KEY` (43 chars b64 ≈ seed Ed25519), `GITHUB_OAUTH_CLIENT_SECRET`
   (40 chars), `GITHUB_OAUTH_CLIENT_ID` em texto claro. Credenciais de **dev**, mas reais.
   Bug menor: `GITHUB_OAUTH_CLIENT_SECRET` aparece duas vezes (linha 41 vazia, 48 populada).
2. **`source/backend/config/master.key`** (32 bytes) e **`credentials.yml.enc`** — no working tree.
3. **`deploy/keys/`** — chaves SSH `beheld_deploy` e `vps-bootstrap.pem` (perms 600, `.gitignore` local).

Segredos = SMTP_PASSWORD, DB_PASSWORD, GITHUB_OAUTH_CLIENT_SECRET, BEHELD_PLATFORM_PRIVATE_KEY,
`master.key`. Ver `OPEN_QUESTIONS.md` para a ação recomendada.
