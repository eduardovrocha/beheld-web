# Beheld — Changelog do release 0.1 (bucketizado por tipo)

> Extraído do histórico de commits dos dois repositórios da plataforma:
> `beheld-web` (frontend + backend Rails) e `beheld` (CLI + engine + snapshot-html compartilhado).
> Total: **209 commits** | Janela: **2026-05-10 → 2026-05-30**

Tag de origem em cada item: **[web]** para `beheld-web`, **[cli]** para `beheld`.

---

## Features  ·  (127)

### `dashboard,positions,directory`
- `ee14472` `2026-05-30` **[web]** icon+label link style across action rows, position detail tabs, snapshot-html fix

### `dashboard,positions`
- `60b546d` `2026-05-29` **[web]** conversation page, sub-tabs, link-style actions, mirror near-miss on matches

### `dashboard`
- `0e02d4c` `2026-05-29` **[web]** drop hero handle tail '· your technical portrait'
- `57b64eb` `2026-05-29` **[web]** unify Overview + Publicações + Verificações into one tab

### `company-dashboard`
- `fb9bc7c` `2026-05-29` **[web]** drop hero title tail '· the record of what already happened'

### `headers`
- `1b1437c` `2026-05-29` **[web]** drop decorative emTail subtitles across recruiter/auth views

### `contact`
- `3e69d07` `2026-05-29` **[web]** remove '· sending to @handle' subtitle from header
- `a765466` `2026-05-29` **[web]** drop 'View full profile' link, make handle the profile link
- `0ee6e6f` `2026-05-29` **[web]** locked position field mirrors the focused vaga in the accordion
- `e6d6292` `2026-05-29` **[web]** make previous-message groups an accordion (one open at a time)
- `7d335d6` `2026-05-29` **[web]** group previous messages by position into collapsibles

### `company-messages`
- `15c3789` `2026-05-29` **[web]** remove 'view profile' footer link from dev card
- `a213951` `2026-05-29` **[web]** one dev card (original layout) → click → details
- `f2e84e3` `2026-05-29` **[web]** one collapsible card per dev, grouped by position

### `nav`
- `a9d571a` `2026-05-29` **[web]** remove Messages item from company nav

### `i18n`
- `1f8e22a` `2026-05-29` **[web]** PositionsList — critérios de match + painel de matches (completo)
- `9fe45e1` `2026-05-29` **[web]** PositionsList — seções (SectionFields, ItemListField, SectionsView)
- `411b023` `2026-05-28` **[web]** PositionsList — EmptyPanel, FormTabs, NewForm/EditForm (shell)
- `629f635` `2026-05-28` **[web]** PositionsList — detalhe, ações, tooltips arquivada, status chip
- `fbeade6` `2026-05-28` **[web]** migra PositionsList — lista master (abas, vazios, badge, confirms)
- `ab9c1c9` `2026-05-28` **[web]** migra company/Dashboard (hero, tabs, loading)
- `5a1731a` `2026-05-28` **[web]** migra RecentActivity, MessagesList, SavedDevsList
- `3898d76` `2026-05-28` **[web]** migra StatsGrid, FloatingBack, SaveDevButton + fallback do useI18n
- `48f8510` `2026-05-28` **[web]** migra CompanyNav (piloto da superfície do recrutador)
- `36d441c` `2026-05-28` **[web]** infra escalável — locales JSON, lazy-load, fallback, Intl, plural, typed keys

### `backend`
- `4c34ace` `2026-05-28` **[web]** notificação de vaga expirada (mailer + job) — P20
- `4058040` `2026-05-28` **[web]** camada BundleSignals + API do dev (interest/health) e ajustes de matching
- `ac9b773` `2026-05-27` **[web]** positions matching engine — schema, scorer, lifecycle, curve
- `d8bb79e` `2026-05-26` **[web]** PP12 company dashboard endpoints + saved_devs
- `434180d` `2026-05-26` **[web]** Api::V1 JSON endpoints + CORS for SPA at :5173
- `4df2ec7` `2026-05-26` **[web]** PP10 recruiter→dev contact mediation
- `ba82201` `2026-05-26` **[web]** PP9 public /v/:slug with legacy short_id fallback
- `7258d7a` `2026-05-26` **[web]** PP8 /directory recruiter search with JSONB filters
- `c0f4a69` `2026-05-26` **[web]** PP7 verification notifications (portal/email/webhook)
- `7984a61` `2026-05-26` **[web]** PP6 /verify upload with browser Ed25519 verification
- `b7bd00e` `2026-05-26` **[web]** PP5 company signup + magic-link auth
- `d973532` `2026-05-26` **[web]** PP4 server-rendered dev dashboard
- `cb5f773` `2026-05-26` **[web]** PP3 signed bundle upload via POST /api/v1/bundles
- `5fa443f` `2026-05-26` **[web]** PP2 dev auth via Ed25519 challenge/response
- `6bebdde` `2026-05-26` **[web]** PP1 portal data model — accounts, companies, bundles, verifications, magic_links, messages

### `spa`
- `21f29a1` `2026-05-28` **[web]** contato e directory — selo verificado, dropdown de vaga, mensagens anteriores, carrossel
- `508f5dd` `2026-05-27` **[web]** /company/dashboard positions tab — master/detail + matching UI
- `cf7430d` `2026-05-27` **[web]** shared recruiter chrome — tabs, nav, floating back, button polish
- `1282c34` `2026-05-26` **[web]** PP12 /company/dashboard — stats, activity, messages, saved devs
- `6afbc42` `2026-05-26` **[web]** migrate empresa + dev surfaces from Rails to React (canonical)
- `c229c5d` `2026-05-14` **[web]** brand-color tech icons in L1 / L2 chips
- `ab00f12` `2026-05-14` **[web]** pt-BR / en / es language switcher
- `5014673` `2026-05-14` **[web]** light/dark theme with auto-detect + manual override
- `42adc8e` `2026-05-14` **[web]** apply the Rails portal profile composition to /verify and /v/:id

### `messaging`
- `cc8ba3d` `2026-05-28` **[web]** resposta do dev (F_REPLY), auto-refresh de mensagens e nav

### `positions`
- `2944800` `2026-05-28` **[web]** vaga redesenhada — abas, localização jsonb, arquivar/excluir, matches paginados

### `(sem scope)`
- `9fd35bf` `2026-05-27` **[web]** dev dashboard surfaces anonymous interest + evolution indicator (P21+P22.2)
- `937fb8f` `2026-05-14` **[cli]** surface coach via CLI (view --coach), docs, and build smoke
- `951827c` `2026-05-14` **[cli]** add deterministic coach pipeline + workflow_metrics for Phase 5 bundle
- `379973b` `2026-05-11` **[cli]** implement MCP stdio protocol in devprofile server
- `65bbb0d` `2026-05-10` **[cli]** show collecting screen until 3 sessions are available
- `1a12579` `2026-05-10` **[cli]** fallback to cached scores when engine is offline
- `1db7aa2` `2026-05-10` **[cli]** detect orphan events in view and implement --refresh flag
- `f063620` `2026-05-10` **[cli]** migrate project-scoped registrations and add global scope safety guard
- `3371c61` `2026-05-10` **[cli]** implement VS Code integration via MCP tools and OS notifications
- `f431772` `2026-05-10` **[cli]** Fase 3 — CLI com wizard de onboarding e slash command
- `80f763d` `2026-05-10` **[cli]** Fase 2 — scoring engine full spec (Processor, InsightGenerator, APScheduler)
- `2af0083` `2026-05-10` **[cli]** implement scoring engine — Fase 2
- `2922065` `2026-05-10` **[cli]** implement MCP server with JSONL capture and sanitizer
- `5e2c8f0` `2026-05-10` **[cli]** Fase 1 — MCP server TypeScript em localhost:7337
- `79525c8` `2026-05-10` **[cli]** Fase 0 — build & release pipeline

### `cli`
- `c633a61` `2026-05-27` **[cli]** bundle-age nudge once per shell session (P22.1+P22.3)
- `63c84a2` `2026-05-19` **[cli]** verify reports attestation signals offline (F5.6.1.e)
- `6eef34a` `2026-05-19` **[cli]** snapshot embeds cached attestation in bundle wrapper (F5.6.1.e)
- `f67d7f5` `2026-05-19` **[cli]** devprofile attest — loopback OAuth + cache (F5.6.1.d)
- `dd377be` `2026-05-19` **[cli]** embedded platform keys + sync script (F5.6.0.d)
- `7c01cd0` `2026-05-14` **[cli]** add Git Bootstrap to init wizard as Tela 3.5 (F6.7)
- `da766dc` `2026-05-14` **[cli]** add `devprofile import` for L1 bootstrap (F6.6)

### `snapshot-html`
- `a7b46d7` `2026-05-24` **[cli]** prefixa 🎉 no link Rekor pra marcar inclusão confirmada
- `5bb4e9f` `2026-05-24` **[cli]** nome no header cai em @<github_login> da attestation
- `ca2540c` `2026-05-24` **[cli]** tier badge + Sigstore Rekor + GitHub identity no retrato

### `rekor`
- `ab39c7a` `2026-05-24` **[cli]** integração Sigstore production via @sigstore/sign (DSSE+intoto)

### `F6.12e`
- `56c0712` `2026-05-24` **[cli]** bundle v5 — perfil técnico + insights no HTML do retrato

### `F6.12d`
- `686487a` `2026-05-24` **[cli]** bundle schema v4 — HTML vira renderer fiel do .beheld

### `F6.12c`
- `80b7f5c` `2026-05-24` **[cli]** seção stack na página de perfil + CORS scoped no engine

### `F6.12b`
- `f95d946` `2026-05-24` **[cli]** /beheld stack — MCP tool action + slash command v4

### `F6.12a`
- `19b1f1a` `2026-05-24` **[cli]** extrator de stack — pesos por linguagem + padrões de arquitetura

### `F6.11`
- `c627fc8` `2026-05-24` **[cli]** listagem + import seletivo por host (--github/--gitlab/--bitbucket)

### `F6.7-F6.10`
- `f0b74e1` `2026-05-24` **[cli]** /beheld import + b3 conversational mode + self-heal hardening

### `frontend`
- `e771033` `2026-05-23` **[web]** port profile view to beheld-dev-profile-page-v2 design
- `b8561fb` `2026-05-23` **[web]** port landing page to beheld-landing-v4 design
- `89dc1de` `2026-05-23` **[web]** replace trend placeholder with TrendChart projection
- `8bba177` `2026-05-19` **[web]** IdentityTag renders attestation signals in SPA (F5.6.1.f)

### `landing`
- `8953256` `2026-05-23` **[web]** add ambient constellation background
- `c18b288` `2026-05-14` **[web]** hero redesign — terminal effect, cycling verbs, score bars, AI client icons

### `dev`
- `75ad44c` `2026-05-23` **[web]** per-developer platform keypair via key_id suffix

### `F_UNINSTALL`
- `7505963` `2026-05-23` **[web]** POST /api/attestation/revoke + revoked_at column
- `4b33bd8` `2026-05-23` **[cli]** beheld delete --remote + --all

### `deploy`
- `9c26fed` `2026-05-23` **[web]** Caddyfile site blocks for beheld.dev + install.beheld.dev

### `api`
- `af0098a` `2026-05-19` **[web]** platform_key:list_revoked_attestations rake task (F5.6.1.d)
- `eb095dd` `2026-05-19` **[web]** POST /api/attestation/verify (F5.6.1.c)
- `ee48ec3` `2026-05-19` **[web]** GitHub OAuth flow + attestation issuance + claim (F5.6.1.b)
- `7270ca7` `2026-05-19` **[web]** attestation foundation — table + model + signer (F5.6.1.a)
- `af0d8ea` `2026-05-19` **[web]** GET /api/platform-keys + filesystem-backed registry (F5.6.0.a)

### `platform-key`
- `bf084c8` `2026-05-19` **[web]** rotate to devprofile-platform-2026-q2 (F5.6.0.b)

### `bundle`
- `f6fadee` `2026-05-19` **[cli]** schema v3 — optional wrapper-level attestation (F5.6.1.e)
- `1521cb9` `2026-05-14` **[cli]** split payload into L1/L2 sections, bump v2 (F6.8)
- `929afcc` `2026-05-14` **[cli]** lock .dpbundle wire format contract across Python + TS (Phase 5 / F5.3.2-3)

### `profile`
- `d86174e` `2026-05-14` **[web]** Last Commit shows the actual date + relative as suffix
- `242e766` `2026-05-14` **[web]** reference scale on the Average Test Ratio tooltip
- `63cd03a` `2026-05-14` **[web]** info tooltips on every L1 / L2 fact row
- `3ca9b78` `2026-05-14` **[web]** tooltip headers use full stat names
- `576f218` `2026-05-14` **[web]** info tooltips on the 5 stats grid cells
- `e9793d7` `2026-05-14` **[web]** replace copy buttons with hover tooltip cards
- `fcfd539` `2026-05-14` **[web]** compact proof footer — labels + icon-only copy buttons

### `portal`
- `a38791b` `2026-05-14` **[web]** align color tokens with the Vite SPA (slate + emerald)
- `067dfd7` `2026-05-14` **[web]** light/dark theme with auto-detect + manual override
- `b747fa4` `2026-05-14` **[web]** refined profile UI with trend chart + proof footer
- `14e99c5` `2026-05-14` **[web]** server-rendered profile page + 3-bucket scores + badge styles (Obj 2)

### `portal-backend`
- `056d7c5` `2026-05-14` **[web]** accept v2 bundles + 3-bucket badge thresholds (F6)

### `portal-frontend`
- `cbba6e9` `2026-05-14` **[web]** accept v2 bundles (l1+l2) with v1 fallback

### `scorers`
- `46441f8` `2026-05-14` **[cli]** separate L1 and L2 layers in score computation (F6.5)

### `engine`
- `98c02fe` `2026-05-14` **[cli]** add L1 ingestion endpoint + orchestrator (F6.4)
- `7e8abe6` `2026-05-14` **[cli]** add L1 auth resolver with PAT askpass (F6.3)
- `3c215a2` `2026-05-14` **[cli]** add L1 git extractor (F6.2)
- `2091ba0` `2026-05-14` **[cli]** add L1 data model (git repository signals)

### `snapshot`
- `8ff6e41` `2026-05-14` **[cli]** auto-copy .dpbundle to ~/Desktop for convenience
- `62b0db0` `2026-05-14` **[cli]** upload to portal + QR rendering (Phase 5 / F5.4 — Etapa F)
- `31581f6` `2026-05-14` **[cli]** generate signed .dpbundle end-to-end (Phase 5 / F5.3.1-7)

### `verify`
- `c9178e9` `2026-05-14` **[cli]** offline .dpbundle verification with tampering detection (Phase 5 / F5.3.8-9)

### `snapshots`
- `bd68615` `2026-05-14` **[cli]** add hash-chained snapshot table for .dpbundle (Phase 5 / F5.2)

### `keys`
- `833dc8d` `2026-05-14` **[cli]** add Ed25519 keystore for signed snapshots (Phase 5 / F5.1)

---

## Fixes  ·  (34)

### `snapshot-html`
- `68367a3` `2026-05-30` **[cli]** tolerate null/undefined in escapeHtml

### `backend`
- `ecda212` `2026-05-26` **[web]** qualify ::Company in Api::V1 controllers shadowed by PP12 namespace
- `36b724b` `2026-05-20` **[web]** float Ruby to 3.3-slim in production Dockerfile

### `rekor`
- `6349ea1` `2026-05-24` **[cli]** PEM wrapping + SHA-512 + discriminated errors (parcial — investigação revelou bloqueio)

### `identity_adapter`
- `ed23c7a` `2026-05-24` **[cli]** lookup de ecosystems aceita extensão com ou sem ponto

### `engine`
- `008130d` `2026-05-24` **[cli]** enable SQLite WAL + busy_timeout to prevent concurrent-write lock
- `150519c` `2026-05-14` **[cli]** cap tool_sequence_json growth + auto-heal bloated DBs

### `frontend`
- `0f8743b` `2026-05-23` **[web]** floating controls box matches the v4 mock
- `95250e7` `2026-05-20` **[web]** add @types/node so vite.config.ts compiles in CI

### `dev`
- `13ece25` `2026-05-23` **[web]** start.sh runs migrations BEFORE polling /up

### `version`
- `b36b07d` `2026-05-23` **[cli]** bump remaining hardcoded VERSION constants to 0.3.2

### `install`
- `ea836f4` `2026-05-23` **[cli]** point REPO to eduardovrocha/beheld

### `(sem scope)`
- `cc90f63` `2026-05-23` **[cli]** replace stale ioit-solutions GitHub URLs with eduardovrocha/beheld
- `2e6017a` `2026-05-11` **[cli]** overwrite empty slash command file in installClaudeSlashCommand
- `21b12d3` `2026-05-11` **[cli]** accumulate session tool sequences across incremental JSONL batches
- `c39e4ed` `2026-05-11` **[cli]** update stale test to expect args ["server", "--stdio"]
- `78f3268` `2026-05-11` **[cli]** redirect warnings to stderr when --json or --scores-only
- `c9f651a` `2026-05-11` **[cli]** autostart uses devprofile start to launch both daemons
- `82ac4ea` `2026-05-11` **[cli]** create ~/.devprofile with secure permissions 0700
- `36b2e5a` `2026-05-11` **[cli]** sanitize absolute paths in event metadata before writing JSONL
- `1bdfda8` `2026-05-11` **[cli]** upgrade existing MCP server registration to include --stdio flag
- `de9c78c` `2026-05-10` **[cli]** codesign engine binary after extraction on macOS
- `7074f86` `2026-05-10` **[cli]** detect already-running daemons before spawning new ones
- `3f49943` `2026-05-10` **[cli]** fire-and-forget engine trigger on Stop with 3s timeout
- `6309152` `2026-05-10` **[cli]** correct singular/plural in MCP tool collecting message
- `9238a6f` `2026-05-10` **[cli]** set overall score weights (quality 30, maturity 30, breadth 25, growth 15)
- `82ea140` `2026-05-10` **[cli]** register MCP server with type stdio in ~/.claude.json
- `20ba9f8` `2026-05-10` **[cli]** register MCP server in ~/.claude.json via claude mcp add, not settings.json
- `60d7fd0` `2026-05-10` **[cli]** init bugs — TDZ in callbacks, IPv6 localhost, engine extract, slash command
- `1786edb` `2026-05-10` **[cli]** e2e validation — engine health, DEVPROFILE_DATA_DIR, SQLite recovery, README

### `deploy`
- `f6bbb46` `2026-05-20` **[web]** Caddy handle blocks + env-gated force_ssl (F5.6.0.e)

### `profile`
- `408b9ca` `2026-05-14` **[web]** tooltips no longer clipped — remove article overflow, flip L2 alignment
- `d49266a` `2026-05-14` **[web]** Average Test Ratio value follows the scale (not always green)
- `f30f01b` `2026-05-14` **[web]** proof footer adopts card palette (no more inversion)

---

## Chores  ·  (19)

### `(sem scope)`
- `41094ec` `2026-05-28` **[web]** gitignore .claude/ (artefatos locais de token-tracker)
- `5fc9dbd` `2026-05-28` **[web]** seed visual + docs (diagrama de interação, relatório PP-VAL)
- `74f0e51` `2026-05-23` **[web]** complete devprofile → beheld rename across web/
- `15fd359` `2026-05-23` **[web]** switch production domain to beheld.dev
- `ad86d6d` `2026-05-23` **[web]** update GitHub URLs to eduardovrocha/beheld
- `8418bd3` `2026-05-23` **[cli]** untrack documents/ — local working docs
- `c390b8a` `2026-05-23` **[cli]** rename devprofile → beheld + F5.7/F6 work
- `80299d4` `2026-05-14` **[web]** untrack source/dashboard (separate repo, not part of devprofile-web)
- `48b9a62` `2026-05-14` **[web]** initial commit — Rails portal + React SPA + Docker dev orchestration

### `backend`
- `0536e74` `2026-05-26` **[web]** scaffold portal stack (gems, middleware, docker, ed25519)

### `db`
- `2b7f3a4` `2026-05-23` **[web]** sync schema.rb with the revoked_at migration

### `dev`
- `ad0573f` `2026-05-23` **[web]** add start.sh — one-shot bring-up for the web stack

### `platform-key`
- `aa60c1f` `2026-05-23` **[web]** rotate beheld-platform-2026-q2 — fresh keypair

### `keys`
- `423707d` `2026-05-23` **[web]** rename platform key files devprofile-* → beheld-*

### `cli`
- `ccfd89c` `2026-05-23` **[cli]** sync embedded platform-keys.json with rotated key

### `deploy`
- `a6ece93` `2026-05-20` **[web]** restart Caddy + validate smoke test in deploy.sh
- `9a8e57f` `2026-05-20` **[web]** production docker-compose + Caddy reverse proxy (F5.6.0.e)
- `168ae32` `2026-05-19` **[web]** add deploy/keys/ scaffold for operator credentials
- `317029a` `2026-05-19` **[web]** wire GITHUB_OAUTH_CLIENT_ID/SECRET through compose (F5.6.0.c)

---

## Style  ·  (9)

### `directory`
- `b3f366e` `2026-05-29` **[web]** shrink DevCard action buttons to sm size

### `frontend`
- `11d9ad1` `2026-05-23` **[web]** drop max-w-xl from section 02 lead so it fills the column
- `e9c20cf` `2026-05-23` **[web]** remove italics everywhere
- `3607b07` `2026-05-23` **[web]** zoom 120% global via body { zoom: 1.2 }
- `44cfc06` `2026-05-23` **[web]** bandas de cor nas barras do terminal por valor
- `b10f62c` `2026-05-23` **[web]** terminal demo respeita tema light/dark
- `5d06b3e` `2026-05-23` **[web]** mais ar entre linhas + seções
- `8e4e00a` `2026-05-23` **[web]** widen landing column 860→1032px (+20%)

### `profile`
- `3a7b27b` `2026-05-14` **[web]** proof tooltip opens upward

---

## Build  ·  (1)

### `release`
- `68f951f` `2026-05-23` **[cli]** cross-compile darwin-x64 on arm64 runner + bump to 0.3.1

---

## Tests  ·  (2)

### `backend`
- `45be566` `2026-05-27` **[web]** E2E smoke for positions matching feature

### `spa`
- `80e6abc` `2026-05-26` **[web]** set up Vitest + 5 component tests for PP12

---

## Refactor  ·  (2)

### `spa`
- `9e8f801` `2026-05-28` **[web]** dashboard da empresa em cards (atividade + devs salvos)

### `backend`
- `44d7e68` `2026-05-26` **[web]** rename Bundle → Snapshot to free name for account-bound publication

---

## Outros tipos (preservados para não perder histórico)

## i18n  ·  (8)

### `backend`
- `fec8b95` `2026-05-29` **[web]** Rails i18n for mailers, controllers + per-request locale

### `errors`
- `1326621` `2026-05-29` **[web]** translate API-layer error messages via module translator

### `profile`
- `9489a56` `2026-05-29` **[web]** migrate public portrait (ProfileCard) to t/fmt

### `home`
- `b69fa05` `2026-05-29` **[web]** migrate public landing page to t

### `auth`
- `d9fe336` `2026-05-29` **[web]** migrate company signup/login/verify to t

### `dashboard`
- `29f118a` `2026-05-29` **[web]** migrate dev dashboard to t/tp/fmt

### `contact`
- `d865d81` `2026-05-29` **[web]** migrate /accounts/:id/contact to t/fmt

### `directory`
- `cd2213f` `2026-05-29` **[web]** migrate /directory surface to t/tp/fmt

---

## Docs  ·  (4)

### `platform-key`
- `aaaba92` `2026-05-19` **[cli]** document revocation cascade behavior (F5.6.1.d)
- `83ae6bd` `2026-05-19` **[cli]** align URLs to devprofile.info/api/*

### `(sem scope)`
- `7c39c03` `2026-05-14` **[cli]** reconcile README post-merge + add web/ to .gitignore
- `1802e07` `2026-05-10` **[cli]** add fase-one.md — MCP server implementation reference

---

## UI  ·  (1)

### `snapshot-html`
- `fa76776` `2026-05-24` **[cli]** move 🎉 do link Rekor pro título da seção

---

### Sem prefixo convencional · (2)

- `af42bbe` `2026-05-15` **[cli]** v0.1.1: liveness via /health, JSONL-backed counters, doctor + view alerts
- `f3f2c98` `2026-05-14` **[cli]** Merge Phase 5 (.dpbundle) + coach pipeline

---

## Contagem por tipo

| Tipo | Total |
|---|---|
| `feat` | 127 |
| `fix` | 34 |
| `chore` | 19 |
| `style` | 9 |
| `build` | 1 |
| `test` | 2 |
| `refactor` | 2 |
| `i18n` | 8 |
| `docs` | 4 |
| `ui` | 1 |
| `(sem prefixo)` | 2 |

