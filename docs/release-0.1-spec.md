# Beheld — Release 0.1 (primeiro release público das aplicações web)

> Documento de spec consolidado a partir do histórico de commits do
> repositório `beheld-web` (126 commits, 2026-05-14 → 2026-05-30) e do
> repositório `beheld` (CLI/engine — referências relevantes às aplicações
> web). Serve como referência narrativa do que foi construído até o
> primeiro release.

---

## 1. Visão geral

Beheld é uma plataforma que produz **retratos técnicos verificáveis de
desenvolvedores**. O dev gera um bundle assinado (`.dpbundle`) com seu
score e sinais técnicos, e o portal hospeda esse retrato em uma URL
pública (`beheld.dev/v/:slug`) com verificação criptográfica feita no
próprio navegador. Recrutadores acessam um diretório com filtros, salvam
devs, definem vagas com critérios objetivos e contatam quem corresponde,
sem nunca ver o e-mail ou telefone do dev até este responder.

O primeiro release contempla **três superfícies web** integradas:

| Superfície | Rota canônica | Público |
|---|---|---|
| Retrato público + verificador | `/v/:slug`, `/verify` | Aberto |
| Dashboard do desenvolvedor | `/dashboard` | Dev autenticado por sessão Ed25519 |
| Dashboard da empresa | `/company/dashboard`, `/directory`, `/accounts/:id/contact` | Recrutador autenticado por magic link |

Tudo roda sob `beheld.dev` em produção, com fallback de SPA → SSR Rails
quando o JavaScript falha.

---

## 2. Stack

- **Backend**: Rails 7.2 (Ruby 3.3), Postgres, Redis, ActiveJob
  - Ed25519 via RbNaCl / `ed25519` para assinaturas
  - JSONB para sinais de bundle, posições, atestações
  - Active Mailer para magic links + notificações
- **Frontend**: React 18 + TypeScript + Vite (porta 5173), Tailwind, vitest
  - `crypto.subtle` para verificação Ed25519 no navegador (sem chamada ao servidor)
  - Sistema de design próprio (tokens em CSS variables, modo claro/escuro)
- **Distribuição**: Docker Compose + Caddy (reverse proxy) em VPS Altatech
  (45.225.129.168 → beheld.dev). DNS na Hostinger; SSL termina no Caddy.
- **Integração CLI**: o binário `beheld` (repositório irmão) gera o
  `.dpbundle`, publica via `POST /api/v1/bundles` e abre o navegador no
  retrato; tudo o que aparece na web nasce no CLI.

---

## 3. Marcos do desenvolvimento

Em ordem cronológica, os blocos de trabalho que definiram o produto:

| Período | Bloco | Resumo |
|---|---|---|
| 14/05 | **Fundação** | Portal Rails + SPA React + Docker dev; aceita bundles v2 (l1+l2); scoring em 3 buckets; tema claro/escuro com auto-detect; landing v1 com terminal animado. |
| 19/05 | **Identidade verificável (F5.6)** | Plataform-keys com registry, atestação GitHub via OAuth (loopback no CLI), endpoint público `GET /api/platform-keys`, rake task de chaves revogadas. |
| 20/05 | **Deploy de produção** | docker-compose.production, Caddyfile com handle blocks, force_ssl, smoke test no `deploy.sh`. |
| 23/05 | **Rename + landing v4** | `devprofile` → `beheld`, domínio para `beheld.dev`, landing redesenhada (constellation background, terminal multi-tema, profile v2). Suporte a `F_UNINSTALL` (revogar atestação). |
| 26/05 | **Plataforma social (PPs)** | Sequência PP1→PP12: data model do portal, sessão Ed25519 do dev, upload assinado, dashboard SSR do dev, signup + magic link da empresa, `/verify`, notificações, `/directory`, `/v/:slug`, contato mediado, migração Rails→React, dashboard da empresa. |
| 27/05 | **Matching de vagas** | Engine de matching server-side (PositionThreshold, PositionMatch, EvolutionCurve), UI master/detail no SPA, contador anônimo de interesse + indicador de evolução no dashboard do dev (P21+P22). |
| 28/05 | **i18n + redesenho de vagas + F_REPLY** | Infraestrutura i18n (pt-BR canônico + en/es lazy), migração de quase todas as superfícies, vaga redesenhada (abas, localização jsonb, arquivar/excluir, matches paginados), resposta do dev (F_REPLY) com auto-refresh, BundleSignals layer, notificação de vaga expirada (P20). |
| 29/05 | **Polimento de UI + conversa por empresa** | Acordeão de mensagens anteriores no /contact, remoção de tails decorativos em headers, unificação de tabs no dashboard do dev, MessagesList por dev. |
| 30/05 | **Estilo "ícone + label" + sub-tabs + bugfix** | Vocabulário visual único (link muted mono com ícone) em todas as ações, sub-tabs em Visão geral e em vagas, MatchDetail espelha Near-miss, fix do `escapeHtml` em bundles com wrapper incompleto. |

---

## 4. Features por área

### 4.1 Plataforma & infraestrutura

- **Portal Rails 7.2** com gemas mínimas, Ed25519, middleware ajustado e
  Docker dev orchestrado (Postgres + Redis no host, app em containers)
- **Renomeio `Bundle → Snapshot` no início** para liberar o nome `Bundle`
  para a publicação assinada por conta (PP series)
- **Caddy + Docker Compose** em produção com:
  - SSL automático e `force_ssl` gated por env
  - Site blocks separados para `beheld.dev` e `install.beheld.dev`
  - `deploy.sh` que valida + reinicia Caddy + roda smoke test
- **`start.sh`** para subir o stack web em dev (corrige ordem migração →
  polling do `/up`)

### 4.2 Identidade & verificação criptográfica

- **Bundle schema v2** (l1 + l2 separados) com fallback v1
- **Plataform-keys** registry: endpoint `GET /api/platform-keys`, rotação
  por trimestre (`beheld-platform-2026-q2`), revogação cascateada
- **Atestação GitHub** (F5.6.1): tabela + modelo + signer, fluxo OAuth com
  emissão + claim, endpoint `POST /api/attestation/verify`
- **Atestação por dev** (F_UNINSTALL): coluna `revoked_at`, endpoint
  `POST /api/attestation/revoke`, integração com `beheld delete`
- **Verificação no navegador** (crypto.subtle Ed25519) — o portal nunca
  precisa atestar para o usuário
- **IdentityTag** renderiza sinais de atestação no SPA (F5.6.1.f)
- **Tier badge + Rekor link** (Sigstore production via @sigstore/sign,
  DSSE+intoto) — bundles com inclusão pública no Rekor mostram o badge
  clicável apontando para `search.sigstore.dev`
- **Per-developer platform keypair** via key_id suffix (espaçamento de
  chaves para devs no mesmo trimestre)

### 4.3 Retrato público (`/v/:slug`, `/verify`)

- **Server-rendered** como fallback (SEO + JS-off), com **JSON** entregue
  ao SPA via `format: :json`
- **3-bucket badge thresholds** + UI refinada (TrendChart, proof footer)
- **Trust details panel**: hash do payload, chave pública, identidade
  GitHub, seção Rekor — tudo renderizado client-side
- **Upload por drag-and-drop** em `/verify` para bundle offline
- **Bundles legados v1** continuam respondendo via fallback de short_id
- **CORS scoped** no engine para permitir o portal acessar dados públicos
- **Brand-color tech icons** em chips L1/L2
- **Snapshot v5** com perfil técnico + insights no HTML do retrato
- **Tooltips** em todas as células do grid de stats + linhas de fato L1/L2
  (com referências de escala em Average Test Ratio)
- **Header com `@<github_login>`** automático quando o bundle tem
  atestação

### 4.4 Dashboard do desenvolvedor (`/dashboard`)

- **Autenticação Ed25519 challenge/response** (PP2): CLI faz
  `POST /api/v1/auth/challenge`, assina nonce, troca por `session_token`
  de 24h. Token chega via `?session=<token>` e migra para `sessionStorage`
- **Tabs sincronizadas com URL hash** (`#visao-geral`, `#mensagens`,
  `#configuracoes`)
- **Visão geral em sub-tabs** (Resumo / Publicações / Verificações):
  - Resumo: banner anônimo de interesse (P21), glance cards
    (bundles ativos, contato configurado, tier), curva de evolução (P22)
  - Publicações: cada bundle com hash curto, contagem de verificações,
    ações **Ocultar | Revogar** em link style
  - Verificações: feed de empresas que abriram o retrato
- **Mensagens**: cards por empresa com preview + estado (pendente /
  respondida / ignorada). Clique navega para
  `/dashboard/companies/:company` — página dedicada (mesmo vocabulário do
  `/accounts/:id/contact` do recrutador) com acordeão por vaga, filete
  colorido por status, compositor de resposta (F_REPLY) e ação de ignorar
- **Configurações**: contato (email/telefone só usados após o dev
  responder), recovery email, visibilidade no diretório
- **Slug de bundle clicável** abre o retrato público em nova aba

### 4.5 Dashboard da empresa (`/company/dashboard`)

- **Signup + magic link** (PP5): cadastro server-rendered, magic link de 1
  hora via ActionMailer, verify endpoint que assina cookie de sessão
- **Tabs**: Mensagens, Devs Salvos, Vagas (Overview e Atividade ocultos
  temporariamente)
- **StatsGrid**: 4 cards com totais e taxa de resposta
- **MessagesList**: card por dev (account_id), abre `/accounts/:id/contact`
  para detalhes; auto-refresh ao entrar na aba, ao recuperar foco, e a
  cada 25s
- **SavedDevsList**: cards do dev salvo com nota inline editável; ações
  **enviar mensagem | remover** em link style + ícones
- **PositionsList** — ver §4.6
- **CompanyNav inline** ("Dashboard | Directory") como vocabulário visual
  do recrutador, reaproveitado em todas as superfícies internas

### 4.6 Diretório, contato e vagas

- **`/directory`** (PP8): filtros JSONB no backend, cards de resultado com
  ações **+ Salvar | Contatar | Perfil** em link style com ícones
- **`/accounts/:id/contact`** (PP10): formulário mediado por vaga, painel
  do perfil à esquerda, acordeão de mensagens anteriores agrupadas por
  vaga (uma aberta por vez, vaga em foco trava o campo "Cargo da vaga"
  quando há pendente). Selo verificado, dropdown de vaga
- **Vagas (`#posicoes`)** com sub-tabs **Descrição** + **devs que
  correspondem** dentro do painel de detalhe:
  - **Descrição**: chips de tecnologias, `MatchCriteriaView` (thresholds +
    priorities), markdown sections (responsabilidades, requirements,
    nice to have, technical stack)
  - **devs que correspondem**: tabs internas Match confirmado / Near-miss
    com paginação (15 por página); Match agora exibe a **mesma estrutura
    do Near-miss** (`passou: Test ratio (X% · exigido: Y%) curva: …`)
- **Match engine server-side**: scorer pesa cada signal, computa
  `match`/`near_miss`/`miss`, `EvolutionCurve` por dev (apenas
  test_ratio); recompute inline em create/update + endpoint
  `POST /matches/recalculate`
- **Status chip + expira**: chip à esquerda (active/expired/closed), texto
  `expira DD/MM/YYYY` plano à direita, ações **Editar | Arquivar**
  inline com a localização (link style + ícones)
- **Vaga arquivada**: ações compactas no canto superior (`Reativar`,
  `Excluir`) com tooltip rich
- **P20**: mailer + job de notificação de vaga expirada
- **P21**: contador anônimo de empresas com necessidade que casa com o
  perfil do dev na semana
- **P22.2**: indicador de evolução no dashboard do dev (curva por test
  ratio + dias desde último bundle + dica CLI quando ≥ 5 dias)

### 4.7 Mensageria

- **PP7**: notificações de verificação (portal + email + webhook)
- **F_REPLY**: dev responde inline no `/dashboard/companies/:company`;
  empresa vê resposta no card e nos detalhes do contact page
- **Estados**: pending, responded, ignored — com ícones (◷/✓/✕) e
  paleta consistente
- **Agrupamento**: por dev (recrutador) e por empresa (dev); subdivisão
  por vaga (job_title) dentro de cada conversa

### 4.8 Internacionalização (i18n)

- **Infra escalável**: pt-BR como canônico (typed keys), en empacotado,
  es lazy-load via dynamic import; `Intl` para datas/números, plurais via
  `Intl.PluralRules`
- **Cobertura**: CompanyNav, StatsGrid, FloatingBack, SaveDevButton,
  RecentActivity, MessagesList, SavedDevsList, PositionsList (lista,
  detalhe, formulário, critérios), Dashboard da empresa, /directory,
  /contact, /dashboard, /home, fluxo de auth de empresa
- **Backend**: Rails I18n para mailers e controllers + locale per-request
  via `Accept-Language`
- **Mensagens de erro da API**: traduzidas via module translator standalone
- **Toggle PT/EN/ES** na barra de chrome (Layout)

### 4.9 Design system

- **Tokens em CSS variables**: `--bg`, `--text`, `--muted`, `--rule`,
  `--card-bg`, `--accent`, `--ok`, `--warn`, etc.
- **Tema claro/escuro** com auto-detect (prefers-color-scheme) + override
  manual persistido em sessionStorage; tokens flipam globalmente
- **Vocabulário visual**:
  - Switzer para body, JetBrains Mono para labels uppercase com
    letter-spacing
  - Hairline (`1px var(--rule)`) em vez de sombras
  - Card branco em cream/escuro, sem border-radius
  - Accent gold para valores numéricos
- **Padrão "ícone + label"** (Companies "Dashboard | Directory") replicado
  em todas as ações: link muted mono, hover accent (ou warn para
  destrutivas), separador `|` em `var(--rule)`. Aplicado em:
  - Publicações (Ocultar / Revogar)
  - Dev salvos (enviar mensagem / remover)
  - Resultados de vaga (Perfil / Contatar)
  - Editar / Arquivar de vaga
  - Recalcular (com ícone que gira no busy)
  - Cards do diretório (Salvar / Contatar / Perfil)
- **TabStrip compartilhado** entre dev e empresa
- **FloatingBack** reaproveitado (origem company, usado também no
  `/dashboard/companies/:company`)
- **Ícones SVG inline** com `currentColor` para herdar o hover (sem
  sprites, sem dependência)
- **Constellation background** ambient na landing

### 4.10 Landing & marketing

- Hero redesign com terminal animado (verbos ciclando, score bars,
  ícones de clientes AI)
- Largura ampliada 860→1032px (+20%)
- Bandas de cor nas barras do terminal por valor; respeita tema
- Sem itálicos (decisão de estilo)
- Zoom global 120% via `body { zoom: 1.2 }`

---

## 5. Bugfixes notáveis

| # | Onde | O que |
|---|---|---|
| 1 | `snapshot-html.escapeHtml` | Tolera `null`/`undefined` — bundles legados com `bundle_data` faltando `hash`/`public_key`/`signature` no wrapper não derrubam mais o iframe |
| 2 | `IdentityAdapter` | Lookup de ecosystems aceita extensão com ou sem ponto |
| 3 | Engine SQLite | WAL + `busy_timeout` evitam lock em escrita concorrente |
| 4 | Vite CI | `@types/node` adicionado para `vite.config.ts` compilar em CI |
| 5 | Ruby produção | Flutuação para 3.3-slim no Dockerfile |
| 6 | Caddy | Handle blocks corretos + `force_ssl` gated por env |
| 7 | `start.sh` | Migrations rodam ANTES do polling em `/up` |
| 8 | Api::V1 | Qualificação de `::Company` em controllers shadowed pelo namespace PP12 |
| 9 | Profile | Tooltips não clipados (remoção do overflow do article, flip de alinhamento L2) |
| 10 | Profile | Average Test Ratio segue a escala (não fica sempre verde) |
| 11 | Profile | Footer adota palette do card (sem inversão) |
| 12 | Last Commit | Mostra data real + relativa como sufixo |
| 13 | Rekor | PEM wrapping + SHA-512 + erros discriminados |

---

## 6. Distribuição & deploy

- **Domínio**: `beheld.dev` (produção), `install.beheld.dev` (instalador
  do CLI)
- **Servidor**: VPS Altatech `45.225.129.168` (não Hostinger — só DNS)
- **Imagens**: Docker Compose com Rails backend, Vite build estático
  servido pelo backend ou pelo Caddy, Postgres e Redis no host
- **CI**: cross-compile darwin-x64 em runner arm64 (relevante ao CLI
  irmão, que distribui o binário linkado ao portal)
- **Smoke test pós-deploy** validando `/up`
- **Versão atual**: portal alinhado ao CLI 0.3.x (chaves de plataforma
  rotacionadas em q2/2026)

---

## 7. Estado conhecido para o release

- **Tabs ocultas temporariamente**: "Visão geral" e "Atividade recente"
  no dashboard da empresa estão comentadas no array `TABS` —
  reativar é trivial, os renders permanecem intactos
- **Tier-3 Rekor**: integração via `@sigstore/sign` está em produção mas
  uma investigação revelou bloqueio parcial que deixou um fix parcial
  comitado (`6349ea1`) — verificar antes de prometer SLA de inclusão
- **Bundles legados**: alguns `bundle_data` no banco têm wrapper
  incompleto (`["payload", "attestation"]` apenas). O fix do escapeHtml
  resolve a renderização; investigar caminho de publish para entender
  por que aconteceu (suspeitos: snapshot upload, migração legada,
  sanitizer no `snapshots_controller`)
- **`source/graphify-out/`**: artefato local do skill graphify; gitignored
  no `.claude/`, mas o diretório fica no working tree
- **`@types/jest-dom` + `vitest/globals`**: typecheck reporta erros em
  arquivos pré-existentes não tocados nesta sessão
  (`snapshot-html.ts:404`, `Directory.tsx:462` `inputStyle` órfão,
  `CompaniesNew.tsx`, `VerifyPublic.tsx`) — não bloqueia build mas vale
  limpeza no próximo release

---

## 8. Próximos passos sugeridos (fora do release)

1. **`beheld auth` no CLI** — hoje a sessão do dashboard só é gerada via
   `rails runner` direto no container. Implementar o comando que faz
   challenge/verify e abre o navegador para fechar o fluxo end-to-end
2. **Reativar tabs `Visão geral` e `Atividade recente`** quando a fonte
   de dados estiver consolidada
3. **Investigar publish que grava `bundle_data` incompleto** —
   `snapshots_controller` / sanitizer
4. **Limpeza de erros de typecheck pré-existentes** em arquivos
   listados em §7
5. **Auto-refresh do dashboard do dev** (espelhando o da empresa) na aba
   de mensagens
6. **Validar SLA do Rekor** após o fix parcial de `6349ea1`

---

## Apêndice A — Histórico cronológico bruto (mensagens de commit)

> Convenção `feat(scope) / fix(scope) / chore(scope) / style(scope) /
> i18n(scope) / docs(scope) / build(scope) / test(scope) /
> refactor(scope) / ui(scope)`.

A lista completa está disponível via `git log --oneline` nos dois
repositórios. O período coberto vai de **2026-05-10** (Fase 1 do MCP
server no CLI) a **2026-05-30** (este release).

| Repositório | Commits | Janela |
|---|---|---|
| `beheld-web` | 126 | 2026-05-14 → 2026-05-30 |
| `beheld` (CLI/engine) | 82 | 2026-05-10 → 2026-05-30 |

---

*Documento gerado a partir do histórico de commits — não substitui o
código fonte, mas resume a intenção e o escopo do release.*
