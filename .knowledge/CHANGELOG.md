# Changelog da Base de Conhecimento — web

## 2026-06-09 — Reorganização para dois repos

A base de conhecimento foi movida do nível guarda-chuva (`beheld-inc/.knowledge/`, que não era
repositório git) para **dentro do repo `web`**, refletindo a estrutura real: dois repositórios
independentes (`daemon` e `web`). O conteúdo daemon-específico foi para `daemon/.knowledge/`.

- Criada `web/.knowledge/` com escopo só do portal: `OVERVIEW`, `SUBDIVISIONS` (backend, frontend,
  deploy), `subdivisions/*`, `DOMAIN`, `CONFIG`, `STATE`, `OPEN_QUESTIONS`, `INDEX`, `CHANGELOG`.
- `source/backend/CLAUDE.md` e `source/frontend/CLAUDE.md` mantidos; adicionado `web/CLAUDE.md`
  (visão do repo web).

## 2026-06-09 — Remoção do protótipo `source/dashboard`

Decisão humana: o protótipo "Signal.Dev" (Lovable, React 19 + TanStack Start, dados mock estáticos,
desconectado da API, repo git próprio `engineer-echo-pro`) foi **descartado**.

- Removido `source/dashboard/` por completo (incluía `.git` próprio e mudanças não-commitadas,
  perdidas em definitivo por decisão explícita do usuário).
- O **único** frontend do portal passa a ser `source/frontend`.

## 2026-06-09 — Inicialização

Primeira geração da base de conhecimento via análise estrutural (read-only) do código.
