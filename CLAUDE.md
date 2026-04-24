# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Desenvolvimento
npm run dev:react        # Dev server React (index.html, porta Vite padrão)

# Build
npm run build:react      # Build React → dist-react/

# Qualidade (obrigatório antes de qualquer PR)
npm run lint             # ESLint em .js e .ts
npm run lint:fix         # ESLint com auto-fix
npm run typecheck        # TypeScript permissivo (tsconfig.json)
npm run typecheck:strict # TypeScript strict (tsconfig.strict.json)

# Testes React/unitários
npm run test:react                  # Todos os testes React (vitest)
npm run test:pilot:clientes         # Suite isolada do pilot clientes
npm run test:react:coverage         # Com cobertura (threshold: 80% lines/fn/stmts, 70% branches)

# Testes E2E (Playwright)
npm run test:e2e:login
npm run test:e2e:setup-filial
npm run test:e2e:bootstrap-filial
```

Rodar um único teste: `npx vitest run src/react/features/clientes/components/ClienteForm.test.tsx --config vitest.react.config.ts`

## Arquitetura

### Runtime único React (migração concluída)

O sistema é um SPA React. O `index.html` carrega `/src/react/main.tsx` diretamente.

- **Entry**: `index.html` → `src/react/main.tsx` → `App.tsx` → `AppBootstrap` → `AppRouter`
- **Stack**: React 19 + Zustand + Tailwind CSS v4 + React Router v7
- **Estado**: isolado por módulo via Zustand stores. Auth: `useAuthStore` (session em `sc_auth_session_v1`). Filial: `useFilialStore` (id em `sc_filial_id`).
- **Tipos compartilhados**: `src/types/domain.ts`

O `src/app/main.js` (vanilla JS legado) sobrevive como arquivo morto — não é carregado pelo HTML e não deve ser modificado.

### Fluxo de autenticação React

`useAppBootstrap` hidrata auth + filial do localStorage e determina o status da sessão. `AppRouter` usa `LoginRouteAccess` / `SetupRouteAccess` / `ProtectedAppRoute` para guardar as rotas. Login chama `authApi.signInWithPassword()`, Setup chama `authApi.listUserFiliais()`, sidebar tem logout com `clearSession + clearFilial`.

### Estrutura de módulos

Cada feature vive em `src/react/features/<modulo>/`:
```
components/    # Componentes TSX (Page, Form, ListView, DetailPanel, Card)
hooks/         # useData (fetch), useMutations (save/delete), domínio específico
services/      # API calls via fetch direto ao Supabase REST/RPC
store/         # Zustand store com estado + seletores
types.ts       # Tipos específicos do módulo (além de src/types/domain.ts)
```

### Todos os módulos de negócio são React-only

Dashboard, Clientes, Pedidos, Contas Receber, Produtos, Estoque, Cotação, Relatórios, RCAs, Campanhas. Toda infraestrutura de bridge foi removida.

### Configuração em runtime

O `src/app/api.js` (e o equivalente React via `src/react/app/supabaseConfig.ts`) lêem configuração de:
- `window.__SC_SUPABASE_URL__` / `window.__SC_SUPABASE_KEY__` (injetados pelo `index.html`)
- Fallback: `localStorage` com chaves `sc_supabase_url` / `sc_supabase_key`

Auth session persistida em `localStorage` com chave `sc_auth_session_v1`.

### TypeScript gradual

- `tsconfig.json` — permissivo, cobre todo `src/`. Todo código legado JS usa `// @ts-check` + JSDoc.
- `tsconfig.strict.json` — strict mode, cobre apenas código novo React em `src/react/`.
- Todo código novo React nasce em TypeScript strict. `any` é proibido sem justificativa.

### SQL e banco

Scripts em `sql/` com numeração sequencial. Ordem de aplicação obrigatória: `01 → 02 → 03 → 04 → 05`. Nunca aplicar `01b_rls_anon_dev.sql` em produção — é exclusivo para dev local. Toda migration nova deve ter objetivo, impacto e plano de rollback documentados.

## Documentos de referência ativos

| Documento | Para que serve |
|-----------|----------------|
| `docs/NORTE.md` | Estado atual do sistema e roadmap — ler primeiro |
| `docs/governanca/PLANO_REMOCAO_LEGADO.md` | Checklist granular da migração React por módulo |
| `docs/governanca/ENGINEERING_POLICY.md` | Política de qualidade, tipagem, commits e segurança |
| `docs/governanca/GOVERNANCA_SQL_RLS.md` | Regras obrigatórias para qualquer SQL novo |
| `docs/governanca/CODE_REVIEW_CHECKLIST.md` | Gate obrigatório em todo PR |
| `docs/backend/CONTRATO_MINIMO_SB_V1.md` | Padrão de erro e retorno do layer SB |

## Regras que não mudam

- Commits em Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- PR sem lint + typecheck + testes passando não deve ser mergeado
- Nenhuma regra de negócio financeira fica só no frontend
- Todo SQL novo segue `GOVERNANCA_SQL_RLS.md`
