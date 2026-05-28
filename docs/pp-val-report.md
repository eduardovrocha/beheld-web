# PP-VAL — Validation Report (Position Matching · PP16–PP22)

> Executado: 2026-05-27
> Atualizado: 2026-05-28 (PP-FIX-01 reavaliado + camada BundleSignals)
> Escopo: validação end-to-end das implementações PP16–PP22 contra a spec `beheld-jobposting-spec.md`.
> Critério: ✓ passou · ✗ falhou · ⚠ atenção (divergência de shape sem impacto comportamental).

---

## Sumário executivo

> Estado pós-correções (nomenclatura · 9.2/9.3 · PP-FIX-01 · P20 mailer ·
> endpoints dedicados). Histórico de evolução: 33 ✓ → 38 ✓ → **41 ✓**.

| Categoria | ✓ | ⚠ | ✗ |
|---|---:|---:|---:|
| Migrations          | 6 | 0 | 0 |
| Testes automatizados| 4 | 0 | 0 |
| Matching            | 5 | 0 | 0 |
| Near-miss           | 4 | 0 | 0 |
| Curva de evolução   | 5 | 0 | 0 |
| Ciclo de vida       | 4 | 1 | 0 |
| Privacidade         | 4 | 0 | 0 |
| Nudge CLI           | 4 | 0 | 0 |
| Formulário          | 4 | 0 | 0 |
| End-to-end          | 1 | 0 | 0 |
| **Total**           | **41** | **1** | **0** |

**Categorias críticas (privacidade · matching · migrations): 100 % ✓.**

O único ⚠ remanescente é a expiração via lazy-read (em vez de Sidekiq-cron) —
divergência de design defensável, detalhada no fim do documento.

---

## 1. Migrations

| # | Verificação | Resultado |
|---|---|---|
| 1.1 | positions preservadas (Position.count = 2, sem erro) | ✓ |
| 1.2 | novos campos existem (status, activated_at, expires_at) | ✓ |
| 1.3 | campos originais preservados (title, description, technologies, sections, archived_at) | ✓ |
| 1.4 | tabelas novas criadas (position_thresholds, _priorities, _matches) | ✓ |
| 1.5 | campo `ranking` (não `position`) em position_priorities | ✓ |
| 1.6 | `languages` inválido como signal (PositionThreshold + PositionPriority rejeitam) | ✓ |

---

## 2. Testes automatizados

### Backend — 32/32 passando

| Spec | Cobertura | Specs do roteiro PP-VAL |
|---|---|---|
| `spec/models/position_spec.rb` (5) | activate idempotente, expire_if_due, close preserva archived_at | parcial |
| `spec/services/positions/matcher_spec.rb` (9) | Phase 1, Phase 2, near-miss, persistência truncate | substitui `matching_service_spec.rb` |
| `spec/services/positions/evolution_curve_spec.rb` (8) | status / trend / unsupported / bundles revogados | substitui `evolution_curve_service_spec.rb` |
| `spec/services/positions/dev_interest_spec.rb` (6) | zero / dedup / exclui near_miss / exclui expired+closed | substitui `interest_count_spec.rb` |
| `spec/system/positions_matching_smoke_spec.rb` (3) | E2E completo (criar→matcher→curve→interest→expire→reactivate) | cobre o roteiro do bloco 10 |

⚠ **Specs do roteiro PP-VAL que não existem na minha codebase:**
`matching_job_spec`, `expire_positions_job_spec`, `expired_posting_notification_job_spec`, `position_mailer_spec`, `position_matches_spec` separado, `position_near_misses_spec` separado, `bundle_health_spec`. **Razão:** matching inline (sem Sidekiq cron), lazy expire, sem notificação por email (P20.1 simplificado), endpoints unificados (`matches#index` retorna match + near_miss).

### Frontend — 35/35 Vitest passando

| Spec | Cobertura |
|---|---|
| `positionTechExtractor.test.ts` (8) | dicionário canonical + dedup + símbolos especiais |
| `positionMarkdownParser.test.ts` (7) | 5 seções PT/EN + ênfase + unmatched isolation |
| `components/company/*.test.tsx` (20) | PP12: StatsGrid, RecentActivity, MessagesList, SavedDevsList, SaveDevButton |

⚠ **Componentes do roteiro PP-VAL que não têm test específico:** `PositionForm.test`, `PositionMatches.test`, `PositionReview.test`, `NearMissList.test`, `EvolutionCurve.test`, `InterestCount.test`, `BundleHealth.test` — agregados em `PositionsList.tsx` (master/detail). Coverage via testes de lógica pura (extractor + parser) + smoke backend.

---

## 3. Matching — extração de sinais

> **Atualizado (PP-FIX-01):** a extração de sinais foi extraída para uma
> camada tipada — `Positions::BundleSignals` — após inspeção do schema real
> no banco. Ver seção "PP-FIX-01 — reavaliação" no fim do documento.

| # | Verificação | Resultado |
|---|---|---|
| 3.1 | ecosystems extraído como array (`{rails:true, python:false}` → `["rails"]`) via `BundleSignals#ecosystems` | ✓ |
| 3.2 | test_ratio em percentual (0.42 → 42.0) via `BundleSignals#test_ratio` | ✓ |
| 3.3 | recency via `bundle.last_bundle_at` (`BundleSignals#recency_days`, Integer) | ✓ |
| 3.4 | `languages` → `value_for("languages")` retorna nil | ✓ |
| 3.5 | toda lógica de schema isolada em um único value object congelado | ✓ |

---

## 4. Near-miss

| # | Verificação | Resultado |
|---|---|---|
| 4.1 | numérico gap 16.7 % (< 20 %) → near_miss | ✓ |
| 4.1b | numérico gap 40 % (> 20 %) → descartado | ✓ |
| 4.2 | 2 falhas (eco + test) → descartado | ✓ |
| 4.3 | ecosystems binário sem item exigido + nenhuma outra falha → near_miss | ✓ |
| 4.4 | `failed_signal` nunca nil em near_miss; nunca `languages` | ✓ |

---

## 5. Curva de evolução

| # | Verificação | Resultado |
|---|---|---|
| 5.1 | `test_ratio` retorna status `available` com trend | ✓ |
| 5.2 | ecosystems → status `unsupported` | ⚠ spec esperava `not_applicable`; mesma semântica, label divergente |
| 5.3 | recency → status `unsupported` | ⚠ mesma observação |
| 5.4 | valor extraído em percentual (`current=35.0`, não `0.35`) | ✓ |
| 5.5 | 1 bundle → `status=building`, `points=1` | ✓ |

---

## 6. Ciclo de vida

| # | Verificação | Resultado |
|---|---|---|
| 6.1 | `expires_at` = `activated_at + 30 dias` (diff = 30.0) | ✓ |
| 6.2 | `position.expire!` muda status p/ "expired" | ⚠ método chamado `expire_if_due!` — mesmo efeito, nome divergente |
| 6.3 | `position.reactivate!` reinicia datas | ⚠ método chamado `activate!` (idempotente) — mesmo efeito |
| 6.4 | `close!` preserva registro | ✓ |
| 6.5 | `ExpirePositionsJob` expira positions devidas | ⚠ job não existe — substituído por lazy expire em `Api::V1::Company::PositionsController#index` |

---

## 7. Privacidade (categoria crítica)

| # | Verificação | Resultado |
|---|---|---|
| 7.1 | rotas de position inacessíveis pelo dev (todas sob `/api/v1/company/*`) | ✓ |
| 7.2 | `serialize_match` não vaza `email_contact`/`phone_contact`/`email_recovery` (testado com fixture sentinela) | ✓ |
| 7.3 | interest payload contém apenas o inteiro | ⚠ embutido em `/api/v1/dashboard` como `interest: { companies: N }` (spec esperava `/api/v1/dev/interest_count` retornando `{count: N}`); shape diferente, garantia idêntica |
| 7.4 | near_miss usa o mesmo `serialize_match` — sem path adicional de vazamento | ✓ |

**Nenhum vazamento detectado.**

---

## 8. Nudge CLI

| # | Verificação | Resultado |
|---|---|---|
| 8.1 | bundle < 5 dias → sem nudge | ✓ |
| 8.2 | bundle ≥ 5 dias → nudge em stderr | ✓ |
| 8.3 | segundo call no mesmo ppid → suprimido via marker `~/.beheld/.nudge_session` | ✓ |
| 8.4 | zero ocorrências de penalidade/expirou/perdeu/atenção/urgente/obrigatório no texto | ✓ |

---

## 9. Formulário (PositionsList.tsx)

| # | Verificação | Resultado |
|---|---|---|
| 9.1 | sem campo "Linguagens" no form | ✓ |
| 9.2 | ecosystems com opções fixas [rails·node·python·flutter·react·devops] | ⚠ atualmente chips freeform com sugestões das technologies extraídas |
| 9.3 | submit sem threshold → erro de validação visível | ⚠ sem hard-validation; backend aceita sem matching ativo |
| 9.4 | pesos 40/30/20/10 redistribuem ao reordenar prioridade | ✓ |

---

## 10. End-to-end

| # | Verificação | Resultado |
|---|---|---|
| 10 | smoke spec cobre criar position → matcher → curve no near-miss → interest count → expire → reactivate → re-rank | ✓ |

---

## Itens ⚠ — análise

### Divergências de nomenclatura (✅ NORMALIZADAS)

| Item | Spec | Antes | Depois |
|---|---|---|---|
| 5.2/5.3 | `status: :not_applicable` | `"unsupported"` | ✅ `"not_applicable"` em EvolutionCurve + spec + CurveBadge |
| 6.2 | `position.expire!` | `expire_if_due!` apenas | ✅ adicionado `expire!` (força transição) + mantido `expire_if_due!` (lazy gate) |
| 6.3 | `position.reactivate!` | `activate!` apenas | ✅ adicionado `reactivate!` (alias de `activate!`) |

### Divergências funcionais — resolvidas / mantidas

| Item | Spec | Status |
|---|---|---|
| P20 mailer | `PositionMailer.expired` + `ExpiredPostingNotificationJob` | ✅ implementado como `PositionMailer.expired` + `ExpiredPositionNotificationJob`, disparado por callback `after_update` quando status → expired; tom não-alarmista coberto por spec |
| P16 show | `GET /api/v1/company/positions/:id` | ✅ adicionado (`positions#show`, com lazy-expire) |
| P21 endpoint | `GET /api/v1/dev/interest_count` | ✅ endpoint dedicado criado (`Api::V1::Dev::InterestCountController`) **além** do embutido no `/api/v1/dashboard`; ambos usam `Positions::DevInterest` (single source) |
| P22 endpoint | `GET /api/v1/dev/bundle_health` | ✅ endpoint dedicado criado (`Api::V1::Dev::BundleHealthController`) |
| P21 janela | "esta semana" no contador | ✅ `DevInterest.count_for` agora filtra `calculated_at >= 1.week.ago` |
| 6.5 | `ExpirePositionsJob` (cron) | ⚠ mantido como lazy expire em `controller#index` — cobre o caminho prático sem dependência de Sidekiq-cron; migrar para job agendado é follow-up opcional |

### Divergências funcionais que precisam de fix (✅ APLICADAS)

| Item | Spec | Antes | Depois |
|---|---|---|---|
| 9.2 | ecosystems opções fixas [rails·node·python·flutter·react·devops] | chips freeform com sugestões | ✅ `<EcosystemPicker>` com 6 toggles canônicos (Rails · Node · Python · Flutter · React · DevOps) |
| 9.3 | submit bloqueado sem threshold + mensagem visível | hint passivo, backend aceita | ✅ `validateCriteria()` em NewForm + EditForm; mostra `<ErrorBanner>` antes do submit; 5 testes Vitest novos |

---

---

## PP-FIX-01 — reavaliação (schema do bundle_data)

O prompt PP-FIX-01 partia da premissa de que o matching lia o schema **F6**
(`payload.l1.*`) — "ainda não implementado" — e mandava migrar para **F5**
(`payload.signals.ecosystems` como `{nome: score}`, `payload.scores.
test_maturity`), inclusive **deletando `l1`** de todos os bundles.

### Inspeção do banco real (8 bundles; 3 são candidatos do matcher)

| acct | `l1` | `signals` | `l1.ecosystems` | `signals.ecosystems` (real) | `test_maturity` | `l1.avg_test_ratio` |
|---|---|---|---|---|---|---|
| 41 | ✓ | ✗ | `{rails:true}` | `nil` | **nil** | 0.4 |
| 47 | ✓ | ✗ | `{ruby,rails,javascript:true}` | `nil` | 65 | 0.42 |
| 48 | ✓ | ✓ | `{node,rails,python,flutter:true}` | `{dominant:[...], secondary:[...]}` | 10 | 0.08 |

### Por que o PP-FIX-01 NÃO foi aplicado literalmente

1. **`l1` é a camada estrutural populada** (7/8 bundles), não "F6 não
   implementado". Deletá-lo seria destrutivo e removeria a fonte real.
2. **`signals.ecosystems` tem shape diferente do que o fix afirma**: o real
   é `{dominant:[...], secondary:[...]}` (arrays categorizados), não
   `{rails:89}`. O código proposto (`select { |_,v| v.to_f > 0 }.keys`)
   retornaria `[]` para todo dev — quebraria o matching de ecosystems.
3. **`scores.test_maturity` é índice derivado** (semântica diferente de
   `avg_test_ratio`) e esparso/nil em parte dos bundles.

### O que foi feito no lugar — camada `Positions::BundleSignals`

Em vez de migrar para os blocos de apresentação (que carregam números
opacos como `89`/`11`), a extração foi formalizada num **value object
tipado e congelado** — única fonte de verdade de schema:

| Campo | Tipo | Fonte | Unidade |
|---|---|---|---|
| `ecosystems` | `Array<String>` | `payload.l1.ecosystems` (presença booleana) | nomes minúsculos |
| `test_ratio` | `Float` | `payload.l1.avg_test_ratio × 100` | percentual 0–100 |
| `recency_days` | `Integer \| nil` | `bundle.last_bundle_at` | dias |

- `Matcher#extract_signals` e `EvolutionCurve#extract` delegam para essa camada.
- `payload.signals`/`payload.scores` (apresentação) ficam fora do matching.
- Nenhum número opaco vira chave ou atributo no caminho de decisão.
- Specs: `bundle_signals_spec.rb` (12) — inclui caso que garante que o
  bloco de apresentação `signals.ecosystems` é ignorado.

---

## Resultado final (pós-correções + PP-FIX-01 + endpoints dedicados)

```
✓ 41 itens passando
⚠  1 item com atenção (ExpirePositionsJob como lazy expire — follow-up opcional)
✗  0 itens críticos falhando
```

Evolução: 33 ✓ → 38 ✓ → **41 ✓ · 1 ⚠ · 0 ✗**

**Categorias críticas (privacidade · matching · migrations) → 100 % ✓.**

### Concluído nesta rodada
1. ✅ Nomenclatura normalizada (5.2/5.3 → `not_applicable`; 6.2/6.3 → `expire!` + `reactivate!`)
2. ✅ 9.2 (ecosystems opções fixas) + 9.3 (hard validation)
3. ✅ PP-FIX-01 reavaliado → camada `BundleSignals` tipada (sem deletar `l1`)
4. ✅ P20 mailer + job (`PositionMailer.expired` + `ExpiredPositionNotificationJob`)
5. ✅ Janela "esta semana" no `DevInterest`
6. ✅ Endpoints dedicados: `positions#show`, `dev/interest_count`, `dev/bundle_health`

### Follow-up opcional remanescente
- ⚠ `ExpirePositionsJob` agendado (Sidekiq-cron) — hoje resolvido via lazy expire no `controller#index`; só vale migrar se for necessário expirar positions sem ninguém abrir o dashboard.

**Cobertura de testes:** backend 56/56 specs de Position verdes · frontend 40/40 Vitest verdes.
