# CLAUDE.md — frontend

SPA de **produção** do portal Beheld (`beheld.dev`). React 18 + Vite 5 + TypeScript + Tailwind 3.
Contexto do produto inteiro na raiz (`/CLAUDE.md`) e em `/.knowledge/`. O backend que esta SPA
consome está em `../backend` (ver seu próprio `CLAUDE.md`). Este é o **único** frontend do portal.

## Comandos

```sh
npm run dev          # vite --host 0.0.0.0 (porta 5173)
npm test             # vitest run
npm run test:watch   # vitest
npm run typecheck    # tsc --noEmit
npm run build        # tsc -b && vite build
```

Alias de import `@` → `src/` (`vite.config.ts`). Dentro do Docker o HMR usa `usePolling`.

## Princípio inviolável: verificação no cliente

O retrato público **nunca confia no servidor**. A SPA re-computa o SHA-256 do payload canônico e
verifica a assinatura Ed25519 com `crypto.subtle` (Web Crypto). Se você está mexendo em qualquer
coisa de bundle/verificação, esse é o contrato a preservar.

- `src/lib/verify.ts` — verificação offline de `.dpbundle`. **É o gêmeo de
  `daemon/packages/cli/src/bundle/verify.ts`** — mantenha os dois em sync.
- `src/lib/attestationVerify.ts` — gêmeo de `cli/src/bundle/attestation-verify.ts`; verifica a
  atestação de identidade GitHub contra as platform keys de `/api/platform-keys`.
- `src/lib/canonical.ts` — serialização canônica + hash. **Travado no wire format dos 3 runtimes**
  (engine Python, CLI Bun, este). Mudar aqui exige bump de versão nos três.
- `src/lib/cli-shared/` (`snapshot-html.ts`, `tier.ts`) — código **copiado** do CLI. Sincronização
  é manual; não há pacote compartilhado.
- Schema awareness: as funções aceitam bundles v2 (`l1` + `l2`) e v1 (`signals`). Seção L1/L2
  ausente em bundle antigo é **warning, não falha** (`verify.ts`).

## Roteamento (`src/App.tsx`)

react-router-dom v6. Duas classes de rota:

- **Fora do `<Layout>`** (shell próprio): `/` (LandingV2), `/dashboard` (dev), `/company/dashboard`
  + `/directory` (empresa), `/v/:id` (retrato público), `/docs/cli/*`. Cada um traz a própria
  nav/footer/shell.
- **Dentro do `<Layout>`** (Constellation + toggles Locale/Theme + constraint de largura): páginas
  institucionais (`/compromisso`, `/como-funciona`, `/verify`, etc.) e o catch-all `*` → `/`.
- **Rotas bilíngues por slug**: pares pt/en apontam para o mesmo componente
  (`/companies/new` + `/empresa/cadastro`; `/how-it-works` + `/como-funciona`). Ao adicionar página
  institucional, registre os dois slugs.
- A `Home` antiga segue no repo **sem rota** — a landing viva é `routes/LandingV2/`.

## Acesso à API (`src/lib/`)

- `apiBase()` lê `VITE_API_URL` (build-time), fallback `http://localhost:3000`, sem barra final
  (`src/lib/api.ts`). Em prod é same-origin `/api` atrás do Caddy; em dev o Vite faz proxy de
  `/api` → `VITE_API_TARGET` (default `http://beheld-backend-dev:3000`).
- Clientes por domínio: `api`, `companyApi`, `companyDashboardApi`, `dashboardApi`,
  `directoryApi`, `contactsApi`, `platformKeys`, `docs/docs-api`. Adicione endpoints ao cliente do
  domínio certo, não inline em componentes.
- **Metadados fora do wire format viajam em headers**: `/v/:id` devolve `X-Beheld-Account-Id` e
  `X-Beheld-Company-Name` para manter a struct `Bundle` intacta para verificadores offline
  (`fetchBundleWithAccount`, `api.ts`). Não enfie esses campos dentro do bundle.

## i18n (`src/i18n/`)

- Locales: `pt` (padrão/fonte canônica), `en` (fallback), `es` (carregado sob demanda, code-split).
- Dicionários em `src/locales/{pt-BR,en,es}.json`. Chaves planas dot-namespaced (`nav.*`,
  `company.*`, `positions.*`); valores aceitam tokens `{placeholder}` e plurais `chave.one`/`chave.other`.
- `TKey` é tipado a partir do `pt-BR.json` — adicione a chave no pt-BR primeiro para ganhar
  autocomplete e checagem. Use o provider/hook de `I18nProvider`, não strings cruas.

## Convenções

- Tailwind 3 com design system próprio (tokens em CSS variables, modo claro/escuro — `index.css`).
- Markdown (docs CLI, compromisso) via `marked`/`react-markdown` + `remark-gfm`, **sempre**
  sanitizado com `isomorphic-dompurify`. Não renderize HTML não sanitizado.
- Componentes organizados por domínio: `components/{app,company,dev,landing,docs,position}` + UI
  compartilhada na raiz de `components/`.
- Testes co-localizados (`*.test.tsx`/`*.test.ts`) com vitest + Testing Library + jsdom (41 arquivos).

## Gotcha

O **CI não roda os testes do frontend** (`.github/workflows/ci.yml` só cobre rubocop+brakeman do
backend). Rode `npm test` e `npm run typecheck` localmente antes de afirmar que está pronto.
