# Modelo de Domínio e Fluxos — web

## Entidades (Rails — `source/backend/db/schema.rb`)

- **account** — o dev. `fingerprint` (unique, da pubkey Ed25519), `attestation_id` (FK opcional),
  `email_recovery`, `email_contact`, `phone_contact`, `directory` (opt-in busca), `watch`,
  `notification_email`, `notification_webhook`. *Sem senha — identidade é a chave.*
- **attestation** — binding pubkey↔GitHub. `dev_pubkey_b64`, `dev_pubkey_fingerprint`,
  `github_user_id`, `github_login`, `platform_key_id`, `signed_payload_json`, `signature_b64`,
  `attested_at`, `revoked_at`.
- **bundle** — perfil publicado (account-bound). `url_slug` (unique), `bundle_data` (jsonb),
  `published_at`, `last_bundle_at`, `revoked_at`, `visible`.
- **snapshot** — bundle legacy por `short_id`. `bundle_hash` (unique), `public_key`, `payload`
  (jsonb), `schema_version` (default "v1"), `expires_at`. *Coexiste com bundle pós-split de dados.*
- **auth_challenge** — challenge/response Ed25519. `nonce` (unique), `fingerprint`, `expires_at`, `used_at`.
- **dev_session** — token de sessão do dev. `token` (unique), `expires_at`.
- **company** — recrutador. `name`, `email` (unique). Login por magic link.
- **magic_link** — `token` (unique), `expires_at`, `used_at`.
- **message** — recrutador→dev. `job_title`, `body`, `sent_at`, `responded_at`, `ignored_at`, `reply_body`.
- **saved_dev** — bookmark empresa↔account, com `note` privada.
- **position** (vaga) — `title`, `description`, `location` (jsonb), `technologies` (jsonb, índice GIN),
  `sections` (jsonb), `status` (default "active"), `activated_at`, `expires_at`, `archived_at`.
- **position_threshold** — critério: `signal`, `operator`, `value` (jsonb).
- **position_priority** — ranking ponderado: `signal`, `ranking`, `weight`.
- **position_match** — resultado: `score` (decimal), `match_type`, `failed_signal`, `calculated_at`.
- **verification** — recrutador verificou um bundle: `bundle_id`, `company_id`, `job_title`, `area`.
- **install** — telemetria (uuid). `os`, `version`. *Sem PII (cláusula pétrea).*
- **cli_doc** — docs da CLI versionadas. `version` (unique), `commit_sha`, `tag`, `markdown`, `checksum`, `meta`.

> A estrutura interna do `bundle_data` (scores, sinais, L1/git) é definida pelo **engine** no repo
> `daemon`. Aqui é lida estruturalmente — a tolerância core/enrichment vs legacy l1/l2 vive em
> `BundleSignals.from`.

## Fluxos principais (lado web)

### 1. Publicação de bundle no portal
`beheld share` (CLI, repo `daemon`) → `POST /api/v1/bundles` (`bundles_controller`) → backend
verifica assinatura Ed25519, cria/atualiza **bundle** ligado à **account** (por fingerprint) →
retorna `url_slug`. **Side effects**: INSERT/UPDATE bundles/accounts (Postgres).

### 2. Retrato público + verificação no browser
Visitante abre `/v/:slug` → `frontend` faz fetch do bundle JSON (`profiles#show`) →
`lib/attestationVerify.ts` re-computa SHA-256 e verifica assinatura Ed25519 com `crypto.subtle` →
mostra scores/sinais se válido, ou motivo de adulteração. **Side effects**: nenhum no servidor.
Metadados fora do wire format (account id, company name) viajam em **headers**
(`X-Beheld-Account-Id`, `X-Beheld-Company-Name`).

### 3. Atestação de identidade GitHub
`beheld attest` → `GET /api/auth/github/start` → OAuth GitHub → `github/callback` →
`github_oauth`/`github_api_client` resolvem o usuário → `platform_key_signer` assina o payload →
`attestations#claim` troca `claim_code` pela atestação → liga **attestation** à **account**.
`attestations#verify` checa cripto + revogação (sem write). **Side effects**: INSERT attestation; API GitHub.

### 4. Login da empresa + contato com dev
`POST /api/v1/sessions/company/request` → cria **magic_link**, envia e-mail (`company_mailer`,
Sidekiq) → `/verify` seta cookie de sessão → recrutador navega `/directory`, salva devs
(**saved_dev**), abre vaga (**position**) → `contacts#create` cria **message** → notifica o dev
(`notification_job`, mailer/webhook). **Side effects**: INSERTs, e-mail, webhook (async).

### 5. Matching de vaga ↔ devs
Empresa cria/edita **position** com **position_threshold** + **position_priority** →
`positions#recalculate` chama `positions/matcher.rb` → avalia accounts opt-in contra critérios
(obrigatórios = binário; ponderados = score) → persiste **position_match**.
`expired_position_notification_job` lida com o relógio de 30 dias / reativação.
**`position_matches` é cache por vaga** — cada cálculo trunca e reinsere. **Side effects**: INSERT/UPDATE; jobs.

## Side effects — resumo (web)

- **Writes Postgres**: todas as entidades acima.
- **Jobs Sidekiq**: notificações, resposta de contato, webhooks, expiração de vaga.
- **Externos**: GitHub OAuth/API, SMTP. **Crypto**: assinatura Ed25519 (platform key); verificação no browser.
- **Cache/rate-limit**: Redis (rack-attack em `/api/install/register`, default 10/3600s).
