# Beheld — Referência do CLI

> Fonte: `packages/cli/src/` (commit `d41f476` · 2026-06-08)
> Documento gerado por varredura do código-fonte. O código é autoritativo — specs ficam atrás dele quando divergem.
> Versão do binário declarada em `packages/cli/src/version.ts` (`VERSION = "0.4.1"`), re-exportada por `packages/cli/src/index.ts` e importada por todos os comandos que precisam (`init`, `update`, wizard).

## Sumário

| Comando | O que faz | Efeito | Pré-condição |
|---|---|---|---|
| `beheld` (sem argumento) | Mostra ajuda ou dispara `bootstrap` na primeira vez | escreve em `~/.beheld/` se for primeira vez | nenhuma |
| `beheld bootstrap` | Migra `~/.devprofile/` → `~/.beheld/` e aponta os próximos passos | escreve em `~/.beheld/` | nenhuma |
| `beheld init` | Roda o wizard de instalação: hooks, MCP, daemons, autostart, L1 | escreve em `~/.beheld/`, `~/.claude/`, `~/.continue/`, registra LaunchAgent/systemd | nenhuma |
| `beheld harness list` | Lista todo harness conhecido com fidelidade, estado de detecção e linha explicativa | read-only | nenhuma |
| `beheld harness install` | Instala hooks/tails para harnesses detectados | escreve em arquivos de hook do harness | harness detectado (ou `--force`) |
| `beheld start` | Sobe MCP server (7337) e Scoring engine (7338) | inicia processos, escreve PID e log | nenhuma |
| `beheld stop` | Encerra os daemons | SIGTERM → SIGKILL fallback | nenhuma |
| `beheld restart` | Stop + start, validando `/health` | reinicia processos | nenhuma |
| `beheld status` | Mostra estado dos daemons e sessão corrente | read-only | nenhuma |
| `beheld doctor` | Diagnóstico exaustivo com auto-heal de busy-loop | read-only (com exceção: pode chamar self-heal do engine) | nenhuma |
| `beheld self-heal` | Restaura silenciosamente `/beheld` e MCP server no Claude Code | escreve em `~/.claude/commands/` e `~/.claude.json` | opt-in Claude Code em `~/.beheld/config.json` |
| `beheld view` | Renderiza o perfil técnico atual | read-only (pode disparar processamento com `--refresh`) | engine no ar OU cache disponível |
| `beheld import` | Importa repositórios para o L1 (git history) | rede + escreve no engine | engine no ar |
| `beheld attest` | Vincula sua pubkey Ed25519 à identidade do GitHub | rede + escreve `~/.beheld/attestation.json` | chaves geradas (gera se faltar) |
| `beheld identity link` | Alias de `beheld attest` | idem `attest` | idem `attest` |
| `beheld identity status` | Mostra a identidade GitHub atualmente vinculada | read-only | nenhuma |
| `beheld keys show` | Mostra a public key (Ed25519, JWK) | read-only | chave existente |
| `beheld keys import` | Importa par Ed25519 existente | escreve em `~/.beheld/keys/` | nenhuma chave atual |
| `beheld keys rotate` | Gera novo par, arquiva o atual | escreve em `~/.beheld/keys/` | chave existente |
| `beheld snapshot` | Gera bundle `.beheld` assinado | escreve em `~/.beheld/snapshots/` + `~/Desktop/`, rede para Rekor | engine no ar, dados suficientes |
| `beheld snapshot list` | Lista snapshots registrados no engine | read-only | engine no ar |
| `beheld share` | Publica o bundle mais recente no portal | rede + escreve `last_published_slug` | bundle local existe |
| `beheld verify <file>` | Verifica schema, hash, assinatura, chain e Rekor | read-only (rede com `--verify-rekor`) | nenhuma |
| `beheld auth` | Autentica no portal por challenge-response e abre dashboard | rede + abre navegador | chave existente |
| `beheld update` | Baixa e substitui o binário | rede + sobrescreve `process.execPath`, reinicia daemon | nenhuma |
| `beheld delete --local` | **Destrutivo** — apaga `~/.beheld/` | destrutivo local | exige digitar "apagar tudo" |
| `beheld delete --remote` | **Destrutivo** — revoga attestation no servidor | destrutivo remoto | exige digitar "revogar" |
| `beheld delete --all` | **Destrutivo** — local + remoto + hooks + resíduos `devprofile` | destrutivo total | exige digitar "apagar tudo" |
| `beheld migrate-legacy` | Remove registros MCP project-scoped (migra para global) | escreve em `~/.claude.json` | nenhuma |
| `beheld server` | Inicia o MCP server (uso interno) | inicia HTTP em 7337 ou stdio | nenhuma |

## Flags globais

| Flag | Efeito |
|---|---|
| `-v, --version` | Imprime `0.4.1` (vindo de `src/version.ts`) e sai com código 0. Definido em `packages/cli/src/index.ts:13`. |
| `-h, --help` | Imprime a lista de comandos e sai com código 0. Funciona em qualquer nível de subcomando. |

Hook silencioso de **nudge de bundle** (`maybeShowBundleNudge`) roda em `preAction` antes de qualquer comando: se o bundle local mais recente tem 5+ dias e o TTY suporta, imprime uma linha sugerindo `beheld snapshot`. Falha do nudge nunca quebra o comando (`try/catch` em `packages/cli/src/index.ts:19`).

## Comandos

### `beheld` (sem subcomando)

**Assinatura:** `beheld`
**Efeito:** read-only OU escreve em `~/.beheld/` (na primeira vez).
**Pré-condições:** nenhuma.

**Descrição.** Quando invocado sem subcomando, decide entre rodar `bootstrap` (primeiro contato — não há chaves em `~/.beheld/keys/`) ou imprimir o help padrão do commander (instalação já existente). A função `defaultDispatch` em `packages/cli/src/index.ts:358` faz o gate via `keysExist()`.

**Execução.**
1. Verifica se há par Ed25519 em `~/.beheld/keys/`.
2. Se houver → `program.outputHelp()`.
3. Se não → chama `bootstrapCommand({})`.
4. Subcomando desconhecido (ex.: `beheld bogus`) é tratado em `packages/cli/src/index.ts:382` com `error: unknown command 'bogus'` em stderr e exit 1.

**Resultado esperado (caminho help).** Idêntico a `beheld --help`.

**Resultado esperado (caminho bootstrap).** Ver `beheld bootstrap` abaixo.

**Exit codes.** `0` em help e bootstrap bem-sucedido · `1` para subcomando desconhecido.

**Notas.** O nudge `maybeShowBundleNudge` roda antes do dispatch.

---

### `beheld bootstrap`

**Assinatura:** `beheld bootstrap [--import]`
**Efeito:** escreve em `~/.beheld/`. Idempotente.
**Pré-condições:** nenhuma.

**Descrição.** Onboarding L1-first: faz a ponte (cópia, nunca move) de `~/.devprofile/` para `~/.beheld/`, garante o diretório com mode 0700, e aponta os próximos passos. Com `--import` entra direto no wizard de import.

**Flags**

| Flag | Default | Efeito |
|---|---|---|
| `--import` | false | Após a ponte, dispara `runImport({})` imediatamente. |

**Execução.**
1. Header `beheld bootstrap`.
2. `bridgeLegacyDevprofile()` em `packages/cli/src/lib/legacy-bridge.ts`. Casos reportados: `no_legacy_dir` (silencioso), `empty_legacy`, `copied`, `already_migrated`, `target_non_empty`, `partial_failure`.
3. `mkdirSync(~/.beheld, mode: 0o700)` se não existir.
4. `ensureSecurePermissions(target)` reforça 0700.
5. Imprime "Next steps" com os próximos comandos OU dispara `runImport`.

**Resultado esperado (caso típico, sem legacy).**

```
  ▎ beheld  bootstrap

  ✓  ~/.beheld ready (mode 0700)

Next steps
    →  beheld import        — import git history (L1)
    →  beheld init          — wire Claude Code + Continue.dev hooks
    →  beheld view          — see your profile

  Tip: rerun with --import to enter the L1 wizard now.
```

**Resultado esperado (com legacy copiado).**

```
  ▎ beheld  bootstrap

  ✓  copied <N> item(s) from ~/.devprofile → ~/.beheld
    Original ~/.devprofile preserved + MIGRATED_TO_BEHELD.md marker written.
  ✓  ~/.beheld ready (mode 0700)
(...)
```

**Exit codes.** `0` em sucesso. A função retorna o `BootstrapResult` para testes; o binário não propaga código diferente daquele do `runImport` quando `--import`.

**Notas.** A bridge é cópia, não move — o `~/.devprofile/` é preservado com um marker `MIGRATED_TO_BEHELD.md` dentro. Ver `packages/cli/src/commands/bootstrap.ts:76-103`.

---

### `beheld init`

**Assinatura:** `beheld init [--force] [--lang <en|pt-br>]`
**Efeito:** escreve em `~/.beheld/config.json`, `~/.beheld/keys/`, registra hooks em `~/.claude/`, MCP em `~/.continue/`, instala LaunchAgent (macOS) ou systemd unit (Linux), pode subir os daemons.
**Pré-condições:** nenhuma. Se já há `config.json` e não tem `--force`, pergunta antes.

**Descrição.** Wizard interativo que conecta o Beheld aos harnesses suportados e prepara o estado local. Gera chaves Ed25519 na primeira execução (silencioso se já existirem). A `config.version` gravada vem da constante canônica em `src/version.ts`.

**Flags**

| Flag | Default | Efeito |
|---|---|---|
| `--force` | false | Pula o prompt "Reinicializar?" e roda todos os passos. |
| `--lang <en\|pt-br>` | `en` | Idioma da tela do wizard. Valores inválidos caem em `en`. |

**Execução.**
1. `ensureSecurePermissions()` no diretório.
2. `ensureKeysSilent()` gera par Ed25519 se não houver.
3. Lê `~/.beheld/config.json`. Se existir e sem `--force`, pergunta `Beheld já está configurado. Reinicializar? [s/N]`. Resposta diferente de `s` → imprime `Abortado.` e retorna.
4. Chama `runWizard()` com callbacks para: migrar registros MCP project-scoped, instalar hooks do Claude Code + MCP + slash command, instalar MCP do Continue.dev, extrair o engine PyInstaller, subir daemons (`daemonManager.start`), instalar autostart, e disparar `runImport` opcional.
5. Persiste o resultado em `~/.beheld/config.json` com `version` (importada de `src/version.ts`), `initialized_at`, `dimensions`, `environments` e — se coletado — `author_email`.

**Resultado esperado.** A UI exata é renderizada pelo `runWizard` em `packages/cli/src/ui/wizard.ts` (escopo R6.x), variável por idioma. As mensagens dos callbacks internos incluem:

```
Daemons já em execução
Daemons iniciados
Falha parcial — MCP:<bool> Engine:<bool>
```

**Exit codes.** `0` em sucesso ou cancelamento via `Abortado.`. Falhas internas do wizard propagam o exit do callback.

**Notas.** O `init` registra hooks **globais** (`~/.claude.json`), não project-scoped — `migrateProjectScopedRegistrations` limpa registros antigos primeiro. O autostart usa LaunchAgent (`com.beheld.daemon`) ou systemd user unit (`beheld.service`).

---

### `beheld harness list`

**Assinatura:** `beheld harness list`
**Efeito:** read-only.
**Pré-condições:** nenhuma.

**Descrição.** Mostra cada adapter de harness registrado, sua `capture_fidelity` (`native_hook`, `editor_extension`, `inferred`, `local_log_tail`, `statusline`), o trust tier derivado (`high` / `med` / `low`), se está **detectado** neste host e o estado do tail (`ON`/`off`) quando aplicável.

**Resultado esperado.**

```
  ▎ beheld  harness

  name              fidelity (trust tier)        detection        tail state
  ──────────────────────────────────────────────────────────────────────────
  claude-code        native_hook (high)           ✓ detected         —
      harness chama o Beheld via hook (push, fidelidade alta) · PreToolUse/PostToolUse/Stop em ~/.claude/settings.json
  continue-vscode    editor_extension (high)      ✓ detected         —
      extensão do editor empurra eventos via MCP (push, fidelidade alta)
  windsurf           native_hook (high)           ✓ detected         —
  cursor             local_log_tail (med)         ✓ detected         tail: off
  copilot-cli        statusline (med)             · not detected     tail: off
  copilot-vscode     local_log_tail (med)         ✓ detected         tail: off

  7/8 detected · 0 tails enabled
```

**Exit codes.** `0`.

**Notas.** O comando não spawna binários nem lê conteúdo de sessão — só inspeciona paths. Coberto por `tests/harness-render.test.ts`.

---

### `beheld harness install [names...]`

**Assinatura:** `beheld harness install [names...] [--force]`
**Efeito:** escreve nos arquivos de hook/config do harness. Idempotente.
**Pré-condições:** harness detectado, salvo com `--force`.

**Descrição.** Instala hooks ou habilita tails para os harnesses detectados. Sem nomes posicionais, opera em todos os adapters detectados. Com nomes, restringe a esses.

**Resultado esperado.**

```
  ▎ beheld  harness install

  · <adapter>          (not detected — skipping; use --force to install anyway)
  ✓  <adapter>          installed
  · <adapter>          already installed
  !  <adapter>          manual setup required

  Tip: rerun `beheld harness list` to see the updated state.
```

**Exit codes.** `0`. Erros por adapter são reportados na linha — o comando segue.

---

### `beheld start`

**Assinatura:** `beheld start`
**Efeito:** inicia processos, escreve em `~/.beheld/daemon.pid` e `~/.beheld/daemon.log`.
**Pré-condições:** nenhuma.

**Descrição.** Sobe MCP server (porta 7337) e Scoring engine (porta 7338). Se já estão no ar, imprime estado verde e retorna sem religar.

**Resultado esperado (já no ar).**

```
  ▎ beheld  já estou no ar

  MCP server      ●  porta 7337
  Scoring engine  ●  porta 7338
```

**Resultado esperado (subindo do zero).**

```
  ▎ beheld  subindo os daemons

  Engine pode levar 15-30s no primeiro start…

  ✓  MCP server iniciado    porta 7337
  ✓  Engine iniciado        porta 7338
```

**Exit codes.** `0` em sucesso. `1` se MCP ou engine falharem ao iniciar.

**Notas.** O engine na primeira execução extrai o PyInstaller bundle para `~/.beheld/bin/engine` — daí o cold start de até 30s.

---

### `beheld stop`

**Assinatura:** `beheld stop`
**Efeito:** SIGTERM nos daemons, com fallback SIGKILL após 5s (`daemonManager.stop`).
**Pré-condições:** nenhuma. No-op silencioso se nada está rodando.

**Descrição.** Encerra os daemons.

**Resultado esperado.**

```
  ▎ beheld  encerrando o expediente

  Parando Beheld…
  ✓  Beheld parado
```

**Exit codes.** `0`.

---

### `beheld restart`

**Assinatura:** `beheld restart`
**Efeito:** stop + start, com verificação final de `/health` em ambos os daemons.
**Pré-condições:** nenhuma.

**Descrição.** Reinício gracioso. Mesmo se não estava rodando, executa o start. Após start, faz um check final em `/health` antes de declarar sucesso.

**Resultado esperado (sucesso).**

```
  ▎ beheld  começando do zero

  Parando Beheld…
  ✓  Beheld parado     (graceful, fallback kill -9 se necessário)
  ✓  MCP server respondendo em /health     porta 7337
  ✓  Engine respondendo em /health         porta 7338

  Beheld reiniciado com sucesso.
```

**Exit codes.** `0` em sucesso, `1` se start falhou ou `/health` não respondeu.

---

### `beheld status`

**Assinatura:** `beheld status`
**Efeito:** read-only.
**Pré-condições:** nenhuma. Daemons offline geram apenas estado `stopped`.

**Descrição.** Estado dos daemons, sessão corrente e coleta do dia.

**Resultado esperado.**

```
  ▎ beheld  observando seu dia

  MCP server      ●  running  pid <N>, port 7337
  Scoring engine  ●  running  pid <N>, port 7338

  Sessão atual    <duração> min · <eventos> eventos · <ferramentas>
  Coleta hoje     <N> sessões · <M> eventos
```

**Exit codes.** `0`.

**Notas.** A porta vem de `BEHELD_MCP_URL` / `BEHELD_ENGINE_URL` quando setadas (default 7337/7338).

---

### `beheld doctor`

**Assinatura:** `beheld doctor`
**Efeito:** read-only com exceção — quando confirma as **quatro condições** de busy-loop do engine, dispara `selfHealEngine()`.
**Pré-condições:** nenhuma.

**Descrição.** Diagnóstico exaustivo: health dos daemons, PID file, codesign (macOS), integração Claude Code, processamento (cursor, escrita do `profile.db`, WAL, backlog), autostart, assinaturas no `daemon.log`, JSONL do dia.

**Resultado esperado (busy-loop confirmado).**

```
🔧 Auto-heal disparado: engine em busy-loop confirmado
   Evidências:
     • PID <N> LISTEN em :7338
     • /health timeout
     • STAT=<R...>, CPU=<X>%, etime=<...>
     • Cursor parado há <duração> vs sessão mais nova
   Passos:
     ✓ diretório de diagnóstico preparado
     ✓ stack capturado em ~/.beheld/diagnostics/<...>
     ✓ engine matado (<detalhe>)
     ✓ socket :7338 liberado
     ✓ WAL checkpoint executado
     ✓ daemon.pid limpo (engine removido)
     ✓ daemon religado
   Rode `beheld doctor` para confirmar o estado pós-heal.
```

**Exit codes.** `0` tudo verde · `1` há warnings · `2` há críticos.

**Notas.** O auto-heal só dispara quando **todas** estas condições coincidem: listener na porta + `/health` crítico + STAT contém `R` + CPU > 50% + cursor parado mais que o threshold.

---

### `beheld self-heal`

**Assinatura:** `beheld self-heal [--verbose]`
**Efeito:** escreve em `~/.claude/commands/beheld.md` e `~/.claude.json` quando algum desses sumiu. Idempotente.
**Pré-condições:** opcionalmente `~/.beheld/config.json` com `environments.claudeCode = true`.

**Descrição.** Recria silenciosamente o slash command `/beheld` e o registro MCP global se algum dos dois foi removido.

**Exit codes.** Sempre `0` — uma falha do heal nunca quebra a sessão.

---

### `beheld view`

**Assinatura:** `beheld view [--json] [--scores-only] [--refresh] [--coach] [--session-hint <phase>]`
**Efeito:** read-only. Com `--refresh`, chama `POST /process-new` no engine.
**Pré-condições:** engine no ar **ou** cache disponível em `~/.beheld/profile.db`.

**Descrição.** Renderiza o retrato técnico atual. Modos: profile completo (default), JSON, scores crus, coach view.

**Flags**

| Flag | Default | Efeito |
|---|---|---|
| `--json` | false | Emite JSON em stdout. |
| `--scores-only` | false | Emite scores separados por espaço. |
| `--refresh` | false | Antes de renderizar, processa eventos pendentes. |
| `--coach` | false | Renderiza coach view. |
| `--session-hint <phase>` | `unknown` | Hint do estágio da sessão atual. |

**Resultado esperado (engine offline, sem cache).**

```
  ▎ beheld  seu retrato hoje

  ✗ Engine offline e nenhum score cacheado disponível.
  Execute: beheld start
```

**Exit codes.** `0` em sucesso · `1` engine offline sem cache.

---

### `beheld import [url]`

**Assinatura:** `beheld import [url] [--list] [--remove <hash>] [--github] [--gitlab] [--bitbucket]`
**Efeito:** rede + escreve no banco do engine.
**Pré-condições:** engine no ar.

**Descrição.** Bootstrap L1: importa o histórico Git de repositórios para alimentar a base histórica. `author_email` obrigatório.

**Resultado esperado (URL importada).**

```
  ▎ beheld  trazendo seu histórico

  →  https://github.com/.../...

  ✓  <N> commits importados — adicionado ao L1

  ✓  Bootstrap concluído · 1 repositório(s) · <N> commits analisados
```

**Exit codes.** `0` em sucesso e em "skipped". `Ctrl+C` no prompt secreto sai com `130`.

---

### `beheld attest`

**Assinatura:** `beheld attest [--url <url>]`
**Efeito:** abre navegador, escuta callback em porta efêmera local, escreve `~/.beheld/attestation.json`.
**Pré-condições:** rede; chave Ed25519.

**Descrição.** OAuth GitHub via loopback HTTP. Vincula a public key local à identidade GitHub.

**Resultado esperado.**

```
  ▎ beheld  verificando identidade GitHub

  →  subindo servidor local para callback
  →  abrindo navegador em <baseUrl>
  →  recebendo attestation
  ✓  identidade atestada
     github:        <login> (id=<N>)
     platform_key:  <key-id>
     attested_at:   <ISO>
```

**Exit codes.** `0` sucesso · `1` timeout, CSRF, ou erro de claim.

---

### `beheld identity link`

**Assinatura:** `beheld identity link [--url <url>]`
**Efeito:** alias direto de `beheld attest`.

**Descrição.** Nome da operação no vocabulário da Fase 5 / F5.6. Implementação chama `attestCommand(opts)`.

---

### `beheld identity status`

**Assinatura:** `beheld identity status`
**Efeito:** read-only.

**Descrição.** Imprime a identidade GitHub vinculada à chave local.

**Resultado esperado (vinculada).**

```
  ▎ beheld  identidade GitHub

  →  vinculada
  github:        @<login> (id=<N>)
  platform_key:  <key-id>
  attested_at:   <ISO>
```

**Exit codes.** `0`.

---

### `beheld keys show`

**Assinatura:** `beheld keys show`
**Efeito:** read-only.

**Descrição.** Mostra a public key Ed25519 atual (JWK) e sua fingerprint.

**Resultado esperado.**

```
  ▎ beheld  sua chave de assinatura

  Public key (Ed25519, JWK)
     x:           <base64url>
     fingerprint: <hex>
     path:        ~/.beheld/keys/public.jwk
```

**Exit codes.** `0` em sucesso · `1` se não há chave.

---

### `beheld keys import <path>`

**Assinatura:** `beheld keys import <path>`
**Efeito:** escreve `~/.beheld/keys/private.jwk` (0600) e `public.jwk` (0644). Recusa se já existe par.

**Descrição.** Importa um par Ed25519 já existente (JWK ou PEM).

**Exit codes.** `0` em sucesso · `1` se faltou path, arquivo não existe, ou já há chave.

---

### `beheld keys rotate`

**Assinatura:** `beheld keys rotate`
**Efeito:** gera novo par; o par anterior é arquivado em `~/.beheld/keys/archive/<timestamp>/`.

**Descrição.** Substitui o par Ed25519 atual. Snapshots antigos continuam verificáveis porque carregam a public key no próprio bundle.

**Exit codes.** `0` em sucesso · `1` se não há chave para rotacionar.

---

### `beheld snapshot`

**Assinatura:** `beheld snapshot [--output <path>] [--share] [--html] [--author-name <name>] [--no-rekor] [--rekor-submit <path>]`
**Efeito:** escreve em `~/.beheld/snapshots/<YYYYMMDD>_<hash8>.beheld`, opcionalmente em `~/Desktop/`. Rede para Rekor.
**Pré-condições:** engine no ar.

**Descrição.** Gera bundle `.beheld` assinado: engine produz payload canônico → CLI canonicaliza, calcula hash, assina com Ed25519, embute attestation se presente, submete ao Rekor, grava em disco.

**Flags**

| Flag | Default | Efeito |
|---|---|---|
| `--output <path>` | — | Grava cópia adicional do bundle no caminho dado. |
| `--share` | false | Faz upload imediato ao portal. |
| `--html` | false | Gera retrato HTML self-contained ao lado do bundle. |
| `--author-name <name>` | `dev` | Nome no retrato HTML. |
| `--no-rekor` | false | Pula submissão ao Rekor. |
| `--rekor-submit <path>` | — | Re-submete um bundle existente ao Rekor. |

**Resultado esperado (sucesso).**

```
  ▎ beheld  capturando o momento

  ✓  Snapshot gerado
     hash:         <24 chars>…
     arquivo:      /Users/.../.beheld/snapshots/<...>.beheld
     desktop:      /Users/.../Desktop/<...>.beheld
     assinado por: <fingerprint>
     identidade:   @<login> · GitHub OAuth

  Perfil capturado
     Engine:               beheld-engine v<...>
     Hash do engine:       <16 chars>…
     Base histórica:       <texto>
     Trajetória observada: <texto>
     Rekor:                ✓ log #<N> · <integratedTime>
     Tier:                 <tier>

→ Publicar perfil verificado? [s/N]
```

**Exit codes.** `0` em sucesso · `1` engine offline / sem dados / chave divergente.

**Notas.** O prompt de publicação é pulado em ambiente não-TTY (CI). `BEHELD_NO_DESKTOP_COPY=1` opta-out da cópia no Desktop.

---

### `beheld snapshot list`

**Assinatura:** `beheld snapshot list`
**Efeito:** read-only.

**Descrição.** Lista snapshots registrados na chain do engine.

**Resultado esperado (com snapshots).**

```
  ▎ beheld  histórico de momentos

  <N> snapshot(s)

  →  <YYYY-MM-DD HH:MM:SS>  <hash12>  <bundle_path>
  •  <YYYY-MM-DD HH:MM:SS>  <hash12>  <bundle_path>
```

Marcador `→` indica snapshot encadeado a um anterior; `•` indica genesis.

**Exit codes.** `0` em sucesso · `1` engine offline.

---

### `beheld share`

**Assinatura:** `beheld share`
**Efeito:** rede + escreve `last_published_slug` em `~/.beheld/config.json`.

**Descrição.** Publica o bundle mais recente local no portal.

**Resultado esperado (sucesso).**

```
  ▎ beheld  publicando perfil

(QR code ASCII)
  <https://...>
```

**Exit codes.** `0` em sucesso · `1` sem bundle, falha de leitura, ou erro de upload.

---

### `beheld verify <file>`

**Assinatura:** `beheld verify <file> [--chain] [--verify-rekor]`
**Efeito:** read-only. Com `--verify-rekor`, rede para o log público.

**Descrição.** Valida o `.beheld`: schema, hash do payload, assinatura Ed25519, presença de seções core/enrichment, opcionalmente a chain de hashes anteriores, attestation de identidade.

**Resultado esperado (válido).**

```
  ▎ beheld  checando autenticidade

  schema       <label>
  sections     <a · b · c>

  Verificação: <file>
    ✓ schema
    ✓ hash
    ✓ signature
    ✓ core         <N> repositórios
    ✓ enrichment   <N> sessões
    ✓ identity  github: <login> (id=<N>)

  Rekor inclusion:
    ✓ Log index: #<N>
    ✓ Timestamp: <ISO> (UTC, imutável)
    ✓ UUID: <uuid>
```

**Exit codes.** `0` em sucesso · `1` qualquer falha de check.

---

### `beheld auth`

**Assinatura:** `beheld auth`
**Efeito:** rede + abre navegador no dashboard.

**Descrição.** Login passwordless via challenge-response.

**Resultado esperado.**

```
beheld auth
  fingerprint: <16 chars>…
  portal:      <https://...>
✓ Autenticado
  <full URL>
```

**Exit codes.** `0` em sucesso · `1` sem chaves, conta não encontrada, falha.

---

### `beheld update`

**Assinatura:** `beheld update`
**Efeito:** rede + sobrescreve `process.execPath`, reinicia daemon.

**Descrição.** Verifica versão remota, baixa o binário para a plataforma atual, valida checksum SHA-256.

**Resultado esperado (atualização disponível).**

```
  ▎ beheld  buscando uma versão mais nova

  Beheld <latest> disponível  (atual: 0.4.1)
  Atualizar agora? [S/n] s
  ✓  Baixando beheld-<plat>
  ✓  Verificando checksum
  ✓  Substituindo binário
  ✓  Reiniciando daemon

  Atualizado para <latest>
```

**Exit codes.** `0` em sucesso · `1` falha de download, checksum, ou substituição.

---

### `beheld delete --local`

**Assinatura:** `beheld delete --local`
**Efeito:** **destrutivo local.** Pára daemon e apaga `~/.beheld/` recursivamente.

**Descrição.** Limpa todo o estado local. Não toca em hooks, attestation remota, ou binário.

**Resultado esperado.**

```
  ▎ beheld  apagando o que sobrou

  Isso apagará <N> sessões de dados locais. Não pode ser desfeito.
  Digite "apagar tudo" para confirmar: apagar tudo
  Parando daemon…
  ✓  Daemon parado
  Apagando ~/.beheld/…
  ✓  ~/.beheld/ removido
```

**Exit codes.** `0`.

---

### `beheld delete --remote`

**Assinatura:** `beheld delete --remote`
**Efeito:** **destrutivo remoto.** Revoga attestation no servidor.

**Descrição.** Assina `{action:"revoke", issued_at, timestamp}` com a chave local e envia ao `/api/attestation/revoke`. **Invalida bundles já compartilhados** que referenciam a attestation.

**Exit codes.** `0`.

---

### `beheld delete --all`

**Assinatura:** `beheld delete --all`
**Efeito:** **destrutivo total.** Pára daemon, revoga attestation remota, apaga `~/.beheld/`, remove hooks/MCP, limpa resíduos `devprofile`.

**Descrição.** Remoção completa. Não apaga o binário — instrui o usuário a rodar `rm $(which beheld)` ao final.

**Exit codes.** `0`.

---

### `beheld migrate-legacy`

**Assinatura:** `beheld migrate-legacy`
**Efeito:** escreve em `~/.claude.json` removendo registros MCP project-scoped do `beheld`.

**Descrição.** Migração one-off: o Beheld antigamente se registrava per-project no Claude Code; o modelo atual é global.

**Exit codes.** `0`.

---

### `beheld server`

**Assinatura:** `beheld server [--stdio]`
**Efeito:** sobe servidor MCP (HTTP em `:7337` no modo padrão; stdio quando `--stdio`).

**Descrição.** Backend MCP do Beheld. Documentado para completude — não é endpoint de uso direto pelo dev.

**Exit codes.** O servidor é long-running.

---

## Variáveis de ambiente relevantes

| Variável | Efeito |
|---|---|
| `BEHELD_DATA_DIR` | Reescreve a raiz dos dados (default `~/`). O diretório real é `<BEHELD_DATA_DIR>/.beheld/`. |
| `BEHELD_MCP_URL` | Reescreve a URL do MCP (default `http://127.0.0.1:7337`). |
| `BEHELD_ENGINE_URL` | Reescreve a URL do engine (default `http://127.0.0.1:7338`). |
| `BEHELD_API_URL` | Override do API platform usado por `attest`, `update` e `delete --remote`. |
| `BEHELD_ENV` | Ambiente (`production` default · aliases `dev`/`local`/`development` → development). |
| `BEHELD_DESKTOP_DIR` | Override para a cópia conveniente do snapshot (default `~/Desktop`). |
| `BEHELD_NO_DESKTOP_COPY` | `=1` desliga a cópia para o Desktop em `snapshot`. |

## Perguntas em aberto

| # | Pergunta | Onde |
|---|---|---|
| 1 | `beheld auth` imprime cabeçalho como `beheld auth` em dim (sem o `▎` do `brand()`), divergindo do padrão visual dos demais comandos. Intencional? | `packages/cli/src/commands/auth.ts:30` |
| 2 | `beheld delete --local` não tem flag inverso para pular o prompt manual (`apagar tudo`); só o caminho `--all` passa `skipConfirm` internamente. | `packages/cli/src/commands/delete.ts:278` |
| 3 | `beheld harness install` sem antônimo: existe `list` e `install`, mas não há comando explícito de "uninstall" ou "disable tail". | `packages/cli/src/commands/harness.ts` |
| 4 | Phase 7 (claims) não está roteada — `docs/beheld-fase7-prompts.md` existe mas nenhum `claims.ts` aparece em `packages/cli/src/commands/`. | spec vs `packages/cli/src/index.ts` |
| 5 | `beheld migrate-legacy` segue exposto como comando público sem prazo / aviso de deprecação documentado. | `packages/cli/src/index.ts:301` |

## Mudanças vs versão anterior do documento

| Item | Status no commit `d7badd8` | Status no commit `d41f476` |
|---|---|---|
| `VERSION` no CLI | Duplicado em 3 arquivos (`0.3.2` vs `0.4.1`) | Fonte única em `src/version.ts`, importada por `init`/`update`/wizard |
| `/api/version` no backend | 404 em produção | Implementado em `VersionsController`, coberto por specs |
| `beheld harness list` | Uma linha por adapter | Duas linhas (row + explicação dim) com blurb por fidelity |
| Testes do `update` flow | Nenhum | `tests/version.test.ts` cobre 6 cenários |
| Testes do `harness list` | Apenas instalador | `tests/harness-render.test.ts` |

## Changelog

| Data | Mudança |
|---|---|
| 2026-06-08 | Re-varredura no commit `d41f476`. Atualizado output do `harness list` (duas linhas), notas de `init`/`update` (VERSION consolidado), seção do `update` (endpoint `/api/version` agora wired), perguntas em aberto reduzidas. |
| 2026-06-08 | Versão inicial — varredura completa de `packages/cli/src/commands/` no commit `d7badd8`. |
