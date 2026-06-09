# Subdivisão: frontend

- **Caminho**: `source/frontend`
- **Pacote**: `beheld-frontend` v0.1.0
- **Stack**: React 18.3, Vite 5, TypeScript 5.5, Tailwind 3, react-router-dom 6, marked +
  react-markdown + remark-gfm, isomorphic-dompurify, simple-icons. Testes: vitest + Testing Library + jsdom.
- **Propósito**: SPA de produção do portal `beheld.dev`. Landing, retrato público com verificação
  Ed25519 no browser, verificador offline drag-and-drop, e dashboards do dev e da empresa.

## Topologia interna (`src/`)

- **routes/** — `Home`, `HowItWorks`, `MeetB3`, `RealSessions`, `Compromisso`, `Directory`,
  `Dashboard` (dev), `VerifyLocal`, `VerifyPublic`, `CompaniesNew`, `CompanyLogin`,
  `CompanyMessages`, `CompanyVerify`, `AccountContact`, `company/Dashboard`, `docs/CliDocs`, e
  `LandingV2/` (landing seccionada).
- **components/** — por domínio: `app/` (shell dashboard dev), `company/`, `landing/`, `docs/`,
  `dev/`, `position/`, e UI compartilhada.
- **lib/** — clientes de API (`api`, `companyApi`, `dashboardApi`, `directoryApi`, `contactsApi`,
  `companyDashboardApi`), verificação (`attestationVerify`, `verify`, `canonical`, `platformKeys`),
  parsing de vaga (`positionMarkdownParser`, `positionTechExtractor`), e `cli-shared/`
  (`snapshot-html`, `tier`) — código **compartilhado com o CLI por cópia**.
- **i18n/** — `I18nProvider`, `dict`, `format`; `locales/{en,es}.json` + `content/COMPROMISSO.*`.
  pt-BR (padrão) / en (fallback) / es (lazy).

## Verificação cripto no browser

`lib/attestationVerify.ts` + `lib/verify.ts` + `lib/canonical.ts` re-computam SHA-256 do payload
canônico e verificam a assinatura Ed25519 com `crypto.subtle` — **nunca confiam no servidor**. São
gêmeos de `daemon/packages/cli/src/bundle/{verify,attestation-verify}.ts`.

## Entradas e saídas

- **Entrada**: `VITE_API_URL` (backend); bundles `.dpbundle` no verificador offline; navegação.
- **Saída**: chamadas fetch ao backend; renderização de retratos/dashboards; verificação local.

## Dependências

- **Interna → backend**: todo dado vem do Rails (`lib/api.ts` e clientes); SSR como fallback.
- **Compartilha por cópia** `cli-shared/` e `canonical` com o CLI (repo `daemon`; wire format travado).
- **Externas**: nenhuma além do backend (verificação é local no browser).

## Estado de implementação: **Implementado**

Evidência: 41 arquivos de teste cobrindo rotas, componentes de empresa, docs, landing e libs.
Três dashboards distintos (público, dev, empresa).

### Débito visível

- `web/handoff.zip` versionado na raiz de `web/` — artefato de handoff, não código.
- `docs/landing-motion-mockup.html` — mockup estático ao lado do código.

> Guia de trabalho detalhado em `source/frontend/CLAUDE.md`.
