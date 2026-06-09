# Questões Abertas — web (decisão humana)

## 1. (CRÍTICO) Segredos reais presentes no working tree — rotacionar?
`deploy/development/.env` contém `BEHELD_PLATFORM_PRIVATE_KEY` (seed Ed25519 dev),
`GITHUB_OAUTH_CLIENT_SECRET` (40 chars) e `DB_PASSWORD` populados; `source/backend/config/master.key`
e `deploy/keys/{beheld_deploy,vps-bootstrap.pem}` (chaves SSH) também estão em disco. Rotulados
"dev", mas reais.
**Decisão**: já foram expostos fora desta máquina (backup, sync, push)? Se sim, rotacionar a
platform key dev, o secret do OAuth App `Ov23liVeZQqKw2fLYsP8`, e as chaves SSH do VPS. Confirmar
que `.env`, `master.key` e `deploy/keys/*` estão no `.gitignore` do repo `web` antes de commitar.

## 2. (ALTO) `bundle` vs `snapshot` — quando aposentar o legacy?
Dois modelos coexistem; rotas legacy `POST /bundles → snapshots#create` mantidas por retrocompat do CLI.
**Decisão**: existe plano de deprecação do `snapshot`/`short_id`, ou os dois ficam indefinidamente?

## 3. (MÉDIO) CI cobre apenas lint + brakeman
`source/backend/.github/workflows/ci.yml` roda só `brakeman` e `rubocop`. **Não há job de testes**
(RSpec, vitest). **Decisão**: os 99 arquivos de teste (58 backend + 41 frontend) rodam só localmente?
Adicionar jobs de teste no CI?

## 4. (BAIXO) `web/handoff.zip` versionado
Artefato de handoff na raiz de `web/`. **Decisão**: remover do controle de versão / mover para fora.

## 5. (BAIXO) Notificação de match ainda síncrona
`positions_controller.rb:292` indica intenção de mover para Sidekiq mas segue inline.
**Decisão**: priorizar a migração para `PerformLater` (latência no recálculo de matches).

---

> Resolvido em 2026-06-09: ~~`source/dashboard` (protótipo "Signal.Dev")~~ — descartado e removido
> (ver `CHANGELOG.md`). O único frontend do portal é `source/frontend`.
