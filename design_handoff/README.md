# Handoff: Beheld — Landing v2

## Overview

A widescreen marketing landing page for **beheld**, a local daemon that observes a developer's real coding sessions and git history and signs a verifiable bundle. The landing carries the full product manifesto, explains the daemon, walks through three install steps, breaks down what a "real session" looks like, presents Claimed-vs-Demonstrated comparisons, lists the privacy guarantees, shows the 5-layer verification chain, addresses common objections via FAQ, and closes with a CTA.

Voice: technical, terminal-native, austere. The brand has a persona — `B3H31D` — that speaks in the first person.

## About the Design Files

The HTML/CSS files in `reference/` are **design references** created as a high-fidelity prototype. They are NOT production code to copy verbatim. Your job is to **recreate this design in your existing beheld app codebase**, using whatever framework/stack it already runs on (React / Next.js / Vue / Astro / plain HTML+JS — adopt whatever is there).

If the existing app has no chosen framework yet, pick what best fits a content-heavy marketing page (Astro or Next.js static export are good defaults for this).

## How to use this with Claude Code

1. Drop this `design_handoff_landing_v2/` folder into your beheld repo (or anywhere Claude Code can read it).
2. Open the folder in Claude Code.
3. Prompt example:
   > "Implement the landing page described in `design_handoff_landing_v2/README.md`, using the files in `reference/` as the visual source of truth. Follow the existing codebase's framework, component patterns, and conventions. Keep the same DOM structure for the sections so the design specs map 1:1."
4. Have Claude Code componentize each section, lift the design tokens into your existing token system (or create a new one), and wire the three interactive behaviors (machine counter animation, install copy-to-clipboard, FAQ accordion, scroll reveal).

## Fidelity

**High-fidelity (hifi).** Exact colors, typography, spacing, breakpoints, and interactions. Reproduce pixel-faithfully but adapt to your codebase's component primitives — don't ship the literal HTML.

---

## Design Tokens

All defined as CSS custom properties in `reference/beheld.css` `:root`. Lift these into your design-token system.

### Colors — neutrals (cool, near-black)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a0b0b` | Page background |
| `--bg-2` | `#0f1110` | Alternating section bg |
| `--surface` | `#141716` | Cards, table headers, terminal title bar |
| `--surface-2` | `#191c1b` | Inner tracks, deeper panels |
| `--line` | `#242826` | Hairlines, dividers, default borders |
| `--line-2` | `#2f3432` | Stronger borders (terminal frame, install box) |
| `--ink` | `#eef0ee` | High-contrast text, titles |
| `--ink-2` | `#b6bbb7` | Body text |
| `--ink-3` | `#7d837f` | Secondary text |
| `--ink-4` | `#565b58` | Dim labels, eyebrows |
| `--ink-5` | `#3a3f3c` | Almost-dim (signal track empty bars) |

### Colors — signal (the one accent)

| Token | Value | Use |
|---|---|---|
| `--signal` | `oklch(0.80 0.135 152)` ≈ `#58d36c` | Active signal, fills, the cursor in the mark |
| `--signal-dim` | `oklch(0.80 0.135 152 / 0.14)` | Signal-tinted backgrounds (tier pill, focus halo) |
| `--signal-ink` | `oklch(0.88 0.10 152)` ≈ `#7ee08e` | Signal text (slightly lighter for readability on dark) |

### Colors — limited / warning (same L/C, hue rotated)

| Token | Value | Use |
|---|---|---|
| `--amber` | `oklch(0.80 0.135 75)` | "Limited" sinal, the ✗ negation list, warning bars |
| `--amber-dim` | `oklch(0.80 0.135 75 / 0.13)` | Amber-tinted backgrounds |

**Rule**: the signal green is an event, not decoration. Use it sparingly to mark what is observed, confirmed, or active. Amber marks "limited / not verified". 95% of the UI lives in neutrals.

### Typography

Two families:

- **`--mono`**: `"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace` — for all data, commands, hashes, labels, eyebrows, the wordmark "beheld" itself. Carries everything the machine produces or observes.
- **`--sans`**: `"Helvetica Neue", Helvetica, Arial, "Segoe UI", system-ui, sans-serif` — for headings, body copy, manifesto. Carries what the brand says.

Load JetBrains Mono via Google Fonts (`https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap`).

Type scale (all clamps are `min, preferred-vw, max`):

| Role | Family | Size | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|---|
| Hero h1 | sans | `clamp(40px, 6.6vw, 86px)` | 600 | -0.035em | 0.98 |
| Section h2 (`.h-sect`) | sans | `clamp(28px, 4.5vw, 48px)` | 600 | -0.02em | 1.04 |
| Lede / body intro | sans | `clamp(16px, 1.7vw, 19px)` | 400 | — | 1.6 |
| Body | sans | 16px | 400 | — | 1.6 |
| Eyebrow / labels | mono | 12px | 400 | 0.18em uppercase | — |
| Terminal | mono | 13.5–14.5px | 400/500 | — | 1.7 |
| Wordmark "beheld" | mono | varies | 700 | -0.04em | 0.82 |

### Spacing & Layout

| Token | Value | Use |
|---|---|---|
| `--maxw` | `1560px` (wide variant) | Container max width — important: this design uses the horizontal space |
| `--gut` | `clamp(24px, 4.5vw, 88px)` | Side gutters |

Section vertical padding: `clamp(56px, 9vw, 132px) 0`.

Sections are separated by `1px solid var(--line)` top borders. Alternating sections use `var(--bg-2)` background for rhythm.

### Borders & Surfaces

- All cards, grids, tables: `1px solid var(--line)` outer border, internal hairlines achieved by `display:grid; gap:1px; background:var(--line)` and children with their own solid background. (This avoids double borders.)
- No border-radius. Sharp corners throughout — part of the "cripto-brutalist" tone.

### Motion

- Reveal on scroll: opacity 0 → 1, translateY 14px → 0, 600ms ease, triggered by IntersectionObserver at threshold 0.15. Respect `prefers-reduced-motion`.
- Signal-bar fill: width 0 → target%, 1100ms cubic-bezier(.2,.7,.2,1), triggered on scroll-in.
- Counter animation: ease-out cubic over 1700ms.
- FAQ accordion: max-height 0 → scrollHeight, 300ms ease.
- Cursor blink (logo, terminal): 1.15s steps(1) infinite.

---

## Logo / Brand Mark — "held-cursor"

The mark is two ink-colored brackets enclosing a green block cursor:

```
[ ▮ ]
```

Conceptually: the daemon **holds** your work **in view**; the contained signal is a **terminal cursor** — alive, blinking. Brackets in `--ink` (#eef0ee), cursor in `--signal` (#58d36c).

### SVG (viewBox 120×120)

```html
<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M46 28 H30 V92 H46" stroke="#eef0ee" stroke-width="7" fill="none"/>
  <path d="M74 28 H90 V92 H74" stroke="#eef0ee" stroke-width="7" fill="none"/>
  <rect x="53" y="45" width="14" height="30" fill="#58d36c"/>
</svg>
```

Stroke-width adjusts slightly with rendered size for legibility (6 at large display, 7 at small, 8 at favicon).

### Inverted (on light surfaces)

Brackets `#0a0b0b`, cursor `#1f9a37`.

### Favicon (data URI)

Already embedded in the v2 HTML `<head>` — `link rel="icon"` with the SVG inline. Copy as-is or replace with your own pipeline.

### Wordmark

`<span class="lk-word"><span class="b">b</span>eheld</span>` — JetBrains Mono 700, `-0.04em` letter-spacing. The lowercase `b` is `--signal-ink` (green). Two parallel names:

- `beheld` (lowercase) — the product
- `B3H31D` (leetspeak, uppercase) — the persona / voice of the daemon, used in pull-quotes only.

---

## Sections / Views

Single long-scroll page. Order matters — it follows a narrative arc.

### 1. Nav (sticky)

- Sticky top, `1px` bottom border, backdrop-blur 12px over `--bg` at 82% opacity.
- 60px tall.
- Left: brand lockup (glyph 24px + wordmark 20px). Links to `#top`.
- Center: nav links (`Manifesto`, `Daemon`, `Sessões reais`, `Verificação`) — mono 12.5px, color `--ink-3`, hover `--signal-ink`. Hidden under 760px viewport.
- Right: `FOREVER FREE FOR DEVELOPERS` — mono 11px uppercase, color `--signal-ink`.

### 2. Hero

- Layout: 2-column grid `1fr 1.12fr`, gap `clamp(40px,5vw,96px)`, vertically centered. Stacks under 980px.
- Left:
  - **H1**: "Beheld by signal." / "Decided by you." — the word "Beheld" is `--signal-ink`. Line-break between sentences.
  - **Lede**: "Um **daemon local** que observa suas sessões reais e seu git, e assina um bundle verificável. Trabalho real — não currículo cheio de palavras-chave."
  - **Counter row**: pulsing green dot + `estou em <N> máquinas` (N animates 0 → 2417 on load, `toLocaleString('pt-BR')`).
  - **Install box** (see component below).
  - **Meta line**: mono 12px: `macOS e Linux · zero dependências · daemon local.`
- Right:
  - **Terminal block** showing `$ beheld view --snapshot` output with signal bars rendered as Unicode `█`/`░` and a blinking cursor at the end. Width 100% of column, mono 14.5px.

### 3. Tools strip

- 30px vertical padding, 1px bottom border.
- Eyebrow label "ferramentas suportadas" + a flex row of items: `Claude Code`, `Continue.dev`, `qualquer harness MCP` (muted), `IDEs via MCP` (muted).
- Each item: mono 14px, with a `8×8px` green square before it (muted items use `--ink-5`).

### 4. Manifesto (`#manifesto`)

- Background: `--bg-2` (slightly elevated).
- Eyebrow: `01 manifesto ───`.
- **Layout: 2-column** `.mani-split` (1.35fr 0.9fr), gap clamp(40px,5vw,88px), vertically centered. Stacks under 920px.
- Left: editorial paragraphs (`.manifesto__body`). First paragraph is the lead, `clamp(20px,2.4vw,26px)`, `--ink`. Rest is `clamp(17px,1.9vw,21px)`, `--ink-2`.
  - "Nenhuma plataforma viu você trabalhando de madrugada ou no fim de semana."
  - "O recrutador não percebe o valor daquele teste escrito pra garantir que o gateway de pagamento funciona em dev e produção de forma isolada..."
  - "Isso é **trabalho real**, não currículo inventado cheio de palavras-chave."
- Right: B3H31D pull quote, with a `1px solid --line-2` left border, 36px left padding. Quote glyphs `"` / `"` in `--signal-ink`.
  - "Você vai esquecer metade do que construiu este ano. Eu não vou. Quando alguém precisar saber quem você é como dev, a resposta não vai ser um currículo, vai ser o que eu vi."
  - Attribution: `— B3H31D`, mono 13px uppercase letter-spaced.

### 5. Daemon (`#daemon`)

- Eyebrow `02 daemon`.
- **4-card grid** (`.grid.grid--4`). Each card: small mono kicker, h3 title (one `$0` is in `--signal-ink`), short body.
  1. `daemon · local` — "Sem cloud" / "Nada sai sem você assinar."
  2. `sinais · L1 + L2` — "Commits + sessões" / "Histórico de git + sessões de Harness e IDEs."
  3. `bundle · Ed25519` — "Assinado offline" / "Verificável sem o Beheld."
  4. `custo pro dev` — `$0` / "Para sempre."
- Below, **2-col** "como vive na sua máquina":
  - Left: h2 + two h3/p blocks ("o que ele observa" / "onde tudo vive").
  - Right: **vertical pipeline diagram** (`.flow`):
    ```
    Claude Code / Continue.dev    [harness / IDE]
              ↓
    servidor MCP                  :7337 · JSONL
              ↓
    scoring engine                :7338
              ↓
    SQLite no seu disco           [local]   ← border var(--signal)
    ```
    Nodes are mono boxes with port labels in `--signal-ink`. Last node has a green border (the "destination").
- Privacy table (`.ptable`) — 2-column: "o dado" | "o que o B3H31D faz":
  - Caminhos absolutos → Substituídos por `[path:<hash 8 chars>]`
  - Diretório de trabalho (cwd) → Vira hash SHA256
  - API keys / segredos → Removidos antes de gravar
  - Conteúdo do código → Nunca lido
- Sempre ligado card: kicker green "sempre ligado", body explains LaunchAgent / systemd, 10MB log rotation.
- B3H31D pull quote: "Eu não decido se você é bom. Eu registro o que você faz, projeto por projeto..."

### 6. Como funciona — 3 passos

- Background `--bg-2`.
- Eyebrow `03 como funciona · três passos`.
- 3-column grid:
  1. `01 · instalação única` — `$ beheld init` — "Daemon em background · SQLite local · chave Ed25519 gerada offline · L1 importado do git log."
  2. `02 · contínuo` — "observado a cada sessão" — "L2 é observado a cada sessão Claude Code. Conteúdo nunca é registrado — só sinais agregados."
  3. `03 · quando quiser` — `$ beheld snapshot` — "Gera o bundle assinado e devolve uma URL pública verificável. Revogável quando você quiser."
- Each step: green-square kicker, h3 title or command box, body.

### 7. Sessões reais (`#sessoes`)

- Eyebrow `04 sessões reais`.
- 2-col header: H2 "O filme do trabalho, não a foto sob pressão." + two h3/p blocks ("o que é uma sessão real" / "o que ele vê numa sessão").
- **`.sess-split`** (1.05fr 0.95fr, stacks <920px):
  - Left: example session **card** — mono key/value rows:
    - projeto · `[proj:a3f8c1d2]`
    - duração · 47 min · 23 turnos
    - ferramentas · read_file · write_file · run_command · edit
    - contexto de teste · **sim**, rspec (the "sim" is green)
    - ecossistema · rails
    - padrão observado · **TDD-first** (green)
    - Italic caption: "Foi isso que eu vi. Não classifiquei. Registrei."
  - Right: two h3/p blocks ("projeto por projeto, mês após mês" / "o que fica local").
- Pull quote: "Eu não te observo para te avaliar. Observo para que, no dia em que você quiser mostrar como trabalha, exista uma resposta honesta — feita de trabalho real, não de adjetivos."

### 8. Claimed vs Demonstrated

- Background `--bg-2`.
- Eyebrow `05 claimed vs demonstrated`.
- 2-col header.
- `.cvd` list — each row: a 24×24 badge (✓ green / ⚠ amber / ○ neutral) + claim + evidence line:
  1. ✓ "Stack principal: Python, TypeScript" — Confirmado. 87% das sessões em Python/TS · 8 repos em L1.
  2. ✓ "Senioridade: 8+ anos backend engineer" — Confirmado. L1 contínuo desde 2017 · test ratio 38%, 4.2× mediana.
  3. ⚠ "Especialização: Senior React Engineer" — Sinal limitado. React em 2 de 87 sessões · trajetória recente Python/FastAPI. (Row has `--bg-2` background.)
  4. ○ "emprego autodeclarado · não verificado pelo Beheld" — Stripe 2020–2022 · USP 2017. "O Beheld não verifica histórico..."

### 9. Verificação (`#verificacao`)

- Eyebrow `06 verificação`.
- H2 "O que ele não faz é tão importante quanto o que faz."
- **`.nots.cols3`** — 3-column grid (2 rows × 3) of the six "✗ não X" guarantees. Each cell: column flex, large amber ✗ on top, bold label + body. Stacks to 2-col under 920px, 1-col under 600px.
  1. **Não envia nada pra nuvem.** O daemon é local...
  2. **Não lê seu código.** Captura sinais, ecossistemas, disciplina de teste...
  3. **Não te dá nota.** Não existe "score de talento"...
  4. **Não conta pra ninguém.** Nenhum recrutador vê nada...
  5. **Não cobra de você.** Nunca. Sem tier premium escondido...
  6. **Não te prende.** Open source, bundle verificável offline...
- H3 "Cadeia de verificação · cinco camadas" + tier pill `tier · fully_verifiable` (green border + tinted bg).
- `.chain` — 5 rows, each: 26px green ✓ check + title (claim) + secondary token (`signature_only`, `chain_intact`, etc.) + body + right-aligned `VERIFIED` label:
  1. Assinatura Ed25519 — chave do dev assina o bundle.
  2. Chain hash — cada bundle referencia o anterior.
  3. Identidade GitHub — OAuth vincula chave pública a usuário GitHub.
  4. Engine version — hash do binário conferido contra build reproduzível.
  5. Sigstore Rekor — hash em log público append-only.
- H3 "As perguntas certas" + `.faq.cols2` — 2-column accordion (stacks <820px). 7 items — see FAQ behavior below.

### 10. Cenas reais

- Background `--bg-2`.
- Eyebrow `07 cenas reais`.
- `.scenes--grid` — **4 columns** on wide (`.landing.wide`), 2 cols mid, 1 col mobile. The final scene `.scene--final` spans full row with `--signal-dim` bg and green border.
  1. "Você foi rejeitado e nunca soube por quê." → Seu trabalho real nunca esteve na mesa.
  2. "Você mudou de carreira e o LinkedIn não conta a história." → O git e as sessões contam.
  3. "Você é freelancer e todo cliente pede 'prova'." → Mande uma URL assinada.
  4. "Você aplica pra fora do seu país." → Sotaque não aparece num bundle.
  5. (Final, full-width) "Você já fez o trabalho." → O Beheld só garante que ele seja visto como é.

### 11. CTA band

- `1px` top border, ~120px vertical padding, centered text.
- H2 "Beheld by signal. / Decided by you." — `clamp(30px,5vw,60px)`.
- Install box (centered, max 560px).
- Below: `forever free for developers` — mono 12px uppercase green.

### 12. Footer

- Flex row, space-between, end-aligned. Wraps on mobile.
- Left: glyph 22px + wordmark "beheld" 22px, then "beheld.dev — Beheld by signal. Decided by you."
- Right: `hi@beheld.dev` then links `GitHub` `Docs` `Manifesto`.

---

## Reusable Components

### Install box

```
[ $ ]  curl -fsSL beheld.dev/install.sh | sh   [COPIAR]
```

- Flex row, gap 14px, `--surface` bg, `1px solid --line-2`, mono 13–16px (clamp).
- Prompt `$` in `--signal-ink`.
- Code: flex 1, nowrap, overflow-x auto.
- Button: transparent, mono uppercase 11px, 1px border `--line-2`, hover → green border + green text. On click: copies the command, label changes to "copiado ✓" for 1.6s.
- Used in hero AND in the CTA band — two instances on the page; give them distinct IDs (`installCmd` / `installCmd2`) so the copy handler can target each.

### Terminal block

- `.term` wrapper: `1px solid --line-2`, dark translucent bg.
- `.term__bar`: 3 dots (none colored — they're style only) + path label.
- `.term__body`: mono pre-formatted, `--ink-2` base color; spans inside control colors:
  - `.pmt` — green prompt `$`
  - `.cmd` — `--ink` (high contrast)
  - `.cm` — `--ink-4` comments
  - `.ar` — `--signal-ink` arrows `→`
  - `.bar-fill` — `--signal` filled blocks `█`
  - `.bar-empty` — `--ink-5` empty blocks `░`
  - `.hl` — `--ink` highlighted values
- `.cursor` — 8px wide green block, blinking 1.1s steps(1) infinite.

### Signal bar (web variant)

- `.sigrow`: 3-col grid `180px 1fr 56px` (label, track, value).
- Track: `--surface-2` bg, 10px tall.
- Fill: `--signal` (or `.fill--amber` for `--amber`), width animates from 0 to target on scroll-in.

### Cards / Grids

`.grid` is `display:grid; gap:1px; background:var(--line); border:1px solid var(--line)` with `.cell` (or any child) using `background:var(--bg)` or `--surface`. This produces hairline separators without double borders. Variants: `.grid--2`, `.grid--3`, `.grid--4`.

### FAQ accordion (`.faq`)

- One-at-a-time accordion (open one → closes others).
- Each item: `.faq__q` button (full-width, sans 600, 19px max, dark hover state green), with a `+` sign that rotates 45° to `×` on open.
- `.faq__a` content panel: max-height 0 → scrollHeight, 300ms ease, inner content is mono `--ink-3` with a green arrow `→` prefix.
- Toggle by setting attribute `open-state="1"` on `.faq__item` and animating `max-height` on `.faq__a`.

**FAQ items** (all 7):

| Q | A (green `→` prefix) |
|---|---|
| Isso é mais um spyware de produtividade? | Não te dá nota e não existe "score de talento" — ele relata o observável, você lê. E nada sai da máquina sem você assinar. |
| O que exatamente ele captura? | Sinais técnicos derivados: ferramentas usadas, ecossistema, disciplina de teste, padrão no tempo. Conteúdo, commit e branch: nunca gravados. |
| Quem vê meu perfil? | Ninguém. Nenhum recrutador, gerente ou empresa vê nada até você gerar um bundle e publicar — e isso é revogável. |
| Se é de graça, qual é a pegadinha? | Não há. Custo pro dev é $0, para sempre. Sem tier premium escondido pra desbloquear depois. |
| Vai pesar na minha máquina? | Sobe sozinho no boot e fica fora do caminho. O log rotaciona a 10 MB. Você não precisa pensar nele. |
| Não confio em rodar um binário qualquer. | Open source e bundle verificável offline. O hash do engine é conferido contra um build reproduzível publicado. |
| Pra que serve se nenhuma empresa usa ainda? | Você já fez o trabalho. O Beheld só garante que ele seja visto como é — uma URL assinada vale mais que um PDF que qualquer um edita. |

---

## Interactions & State

Light, no router needed. All client-side.

1. **Sticky nav** — fixed-position pattern, anchor links scroll to `#section`. `scroll-behavior: smooth` on `html`.
2. **Machine counter** — `estou em N máquinas`. On mount, animate `0 → 2417` (or whatever real value you wire in) over 1700ms with ease-out cubic, formatted with `toLocaleString('pt-BR')`.
3. **Install copy** — clicking COPIAR runs `navigator.clipboard.writeText(...)`, sets label to "copiado ✓" + adds `.copied` class (green text/border), resets after 1600ms. Two instances (`installCmd`, `installCmd2`).
4. **FAQ accordion** — one-open-at-a-time. Click toggles `open-state` and sets `max-height` to `scrollHeight` (or 0).
5. **Scroll reveal** — `[data-reveal]` elements start `opacity:0; transform:translateY(14px)`, gain `.in` class via IntersectionObserver (threshold 0.15) → animate in. Respect `prefers-reduced-motion: reduce` (disable transforms).
6. **Signal bars** — `.fill[data-w]` reads the percentage from `data-w` and applies `width: N%` when the parent `[data-signal]` enters view.

No persistent state. No backend wiring needed for the marketing page. Wire the `2417` counter to a real `/api/stats` endpoint if you have one — it's a single number.

---

## Responsive

- ≥ 980px — full wide layout (max-width 1560px), hero is 2-col.
- 920–980px — hero stacks; manifesto 2-col still.
- 820–920px — manifesto stacks, nots becomes 2-col, scenes 2-col.
- < 820px — FAQ becomes 1-col, nav links hidden.
- < 600px — nots becomes 1-col, scenes 1-col.

All grid breakpoints already defined in `landing.css`.

---

## Accessibility

- Skip-link not present in reference — add one before nav (`Pular para conteúdo` → `#top`).
- Heading order is logical: h1 in hero, h2 per section, h3 within sections.
- FAQ uses `<button>` — keyboard-accessible by default. Wire `aria-expanded` on each `.faq__q` (the reference uses `open-state` attr; for production add `aria-expanded` + `aria-controls`).
- All decorative SVGs have `aria-hidden="true"`.
- Color contrast: `--ink` on `--bg` is ~16:1; `--ink-3` on `--bg` is ~6:1; signal text always uses `--signal-ink` (lighter green) for >4.5:1.
- Respect `prefers-reduced-motion` — disable scroll-reveal transforms, counter animation, bar fills, cursor blink.

---

## Assets

- **Fonts** — JetBrains Mono (Google Fonts). Helvetica is system. No custom font hosting needed unless you self-host.
- **No images** — entire page is type + SVG glyphs + CSS. The logo glyph is a tiny inline SVG (also used as favicon via data URI in `<head>`).
- **No external icon set** — Unicode glyphs only (`→ ✓ ✗ ⚠ ○ ↓ █ ░`).

---

## Files in this bundle

```
design_handoff_landing_v2/
├── README.md                      ← this file
└── reference/
    ├── Beheld — Landing v2.html   ← full HTML reference
    ├── beheld.css                 ← brand tokens + shared components
    └── landing.css                ← landing-specific layouts + wide variant
```

Open the HTML in a browser to see the design behaving end-to-end. Use the CSS files as the source of truth for tokens and component styles when porting.

---

## Recommended porting order

1. Lift tokens into your codebase's token system (CSS variables, Tailwind config, or design-tokens JSON — whatever you use).
2. Implement the brand mark + wordmark as a small component (`<BrandMark size={24} />`).
3. Build the shared primitives: `<Eyebrow>`, `<InstallBox>`, `<Terminal>`, `<SignalBar>`, `<Card>`, `<PullQuote>`, `<Eyebrow>`.
4. Build the page top-down section by section. Reuse the section header pattern (eyebrow + h2 + lede in 2-col).
5. Wire the four interactions: counter, install copy, FAQ accordion, scroll reveal.
6. QA at the documented breakpoints.
7. Lighthouse / aXe pass before shipping.
