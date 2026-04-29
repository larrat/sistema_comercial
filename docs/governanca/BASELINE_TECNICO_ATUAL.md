# Baseline Técnico Atual

> Gerado em: 2026-04-28  
> Método: auditoria de leitura de código — nenhum arquivo foi alterado  
> Status marcados como **[NÃO CONFIRMADO]** quando não lido diretamente

---

## 1. Estrutura geral do projeto

```
sistema_comercial/
├── index.html                  # Entry point real — carrega /src/react/main.tsx
├── src/
│   ├── react/                  # Código React ativo (SPA React 19)
│   │   ├── main.tsx            # createRoot → <App />
│   │   ├── App.tsx             # → <AppBootstrap />
│   │   ├── styles.css          # @import '../styles/style.css' + overrides React
│   │   ├── app/                # AppShell, Router, stores globais, hooks de app
│   │   │   ├── bootstrap/      # AppBootstrap, AppProviders
│   │   │   ├── filial/         # FilialProvider, FilialSwitcher
│   │   │   ├── hooks/          # useAppBootstrap, useCurrentUserRole, useNavigationItems, usePageMeta*, useRouteState*
│   │   │   ├── layout/         # AppShell, AppSidebar, AppTopbar, AppContent*
│   │   │   ├── legacy/         # bridgeMessaging, events, globals, storage
│   │   │   ├── navigation/     # config.ts (nav items), pageMeta.ts*
│   │   │   ├── router/         # AppRouter, routeAccess, routes, AdminOnlyRoute, wave1Navigation
│   │   │   ├── ui/             # AppErrorBoundary, GlobalLoadingOverlay, GlobalToastHost
│   │   │   ├── useAuthStore.ts
│   │   │   ├── useFilialStore.ts
│   │   │   └── useRoleStore.ts
│   │   ├── features/           # 13 módulos de negócio + auth + setup
│   │   │   ├── acessos/
│   │   │   ├── analytics/
│   │   │   ├── auth/
│   │   │   ├── campanhas/
│   │   │   ├── clientes/
│   │   │   ├── contas-receber/
│   │   │   ├── cotacao/
│   │   │   ├── dashboard/
│   │   │   ├── estoque/
│   │   │   ├── filiais/
│   │   │   ├── pedidos/
│   │   │   ├── produtos/
│   │   │   ├── rcas/
│   │   │   ├── relatorios/
│   │   │   └── setup/
│   │   └── shared/
│   │       ├── hooks/          # useKeyboardShortcuts
│   │       ├── lib/            # analytics.ts
│   │       └── ui/             # 15 componentes globais (ver Seção 5)
│   ├── app/                    # JS legado — não carregado pelo index.html (MORTO)
│   ├── core/                   # JS legado (MORTO)
│   ├── features/               # JS legado (MORTO)
│   ├── pilot/
│   │   └── clientes/           # TypeScript — filter.ts e filter.js AINDA importados por useClienteStore
│   ├── shared/                 # JS legado (MORTO)
│   ├── styles/
│   │   └── style.css           # CSS canônico — importado por src/react/styles.css
│   └── types/
│       ├── domain.d.ts         # Tipos globais de domínio (Cliente, Pedido, Produto, etc.)
│       └── global.d.ts
├── sql/                        # 16 migrations Supabase
├── docs/                       # Documentação de governança e arquitetura
├── tests/                      # Testes E2E Playwright
├── tsconfig.json               # Permissivo — cobre todo src/
├── tsconfig.strict.json        # Strict — cobre src/react/
├── vitest.react.config.ts
└── vitest.pilot-clientes.config.ts
```

**Arquivos marcados com `*` são suspeitos de dead code** — ver Seção 10.

---

## 2. AppShell e layout principal

**Arquivo:** `src/react/app/layout/AppShell.tsx`

```
AppShell
└── div.rf-shell
    ├── AppSidebar          (aside.rf-sidebar)
    └── div.rf-shell__main
        ├── AppTopbar       (header.rf-topbar)
        ├── div.rf-shell__viewport
        │   └── <Outlet />  ← conteúdo das páginas
        ├── GlobalLoadingOverlay
        └── GlobalToastHost
```

**Montagem no router:** rota `/app` no `ProtectedAppRoute` do `AppRouter`.

**Entry completo:**
```
index.html
  → src/react/main.tsx (createRoot)
    → App.tsx
      → AppBootstrap.tsx (lê useAppBootstrap)
        → AppProviders.tsx (providers globais)
          → AppRouter.tsx
            → AppShell (rota /app)
              → <Outlet /> → páginas
```

**CSS:** `div.rf-shell` usa grid `rf-shell` definido em `src/styles/style.css`, importado via `src/react/styles.css`.

---

## 3. Router

**Arquivo:** `src/react/app/router/AppRouter.tsx`

**Tecnologia:** React Router v7 (`BrowserRouter` + `Routes`)

**Grupos de acesso:**

| Guard | Rota | Condição |
|---|---|---|
| `LoginRouteAccess` | `/login` | Redireciona para `/app` se autenticado |
| `SetupRouteAccess` | `/setup` | Redireciona se já tem filial |
| `ProtectedAppRoute` | `/app/*` | Redireciona para `/login` se não autenticado |
| `AdminOnlyRoute` | `/app/filiais`, `/app/acessos` | Redireciona se role ≠ `admin` |

**Rotas registradas (13 subrotas de /app):**

| Rota | Componente de entrada | Observação |
|---|---|---|
| `/app/dashboard` | `DashboardRoutePage` | — |
| `/app/clientes` | `ClientesRoutePage` | — |
| `/app/estoque` | `EstoqueRoutePage` | — |
| `/app/cotacao` | `CotacaoRoutePage` | — |
| `/app/pedidos` | `PedidosRoutePage` | — |
| `/app/receber` | `ContasReceberRoutePage` | — |
| `/app/produtos` | `ProdutosRoutePage` | — |
| `/app/rcas` | `RcasRoutePage` | — |
| `/app/relatorios` | `RelatoriosRoutePage` | — |
| `/app/campanhas` | `CampanhasRoutePage` | — |
| `/app/analytics` | `AnalyticsPage` | Dados mock — sem API real |
| `/app/filiais` | `FiliaisRoutePage` | Admin only |
| `/app/acessos` | `AcessosRoutePage` | Admin only — placeholder |

**Rota padrão:** `/app/dashboard` (via `getDefaultAppPath()`).

**Arquivos auxiliares:**
- `src/react/app/router/routes.ts` — tipos e constantes de rotas
- `src/react/app/router/routeAccess.tsx` — guards
- `src/react/app/router/wave1Navigation.ts` — mapeamento legado → rota React (ainda consumido por DashboardRoutePage e ClientesRoutePage)

---

## 4. Sidebar e Topbar

### Sidebar — `src/react/app/layout/AppSidebar.tsx`

- Nav flat — grupos removidos, usa `flatMap` sobre `useNavigationItems()`
- `useNavigationItems()` filtra `NAVIGATION_ITEMS` (de `navigation/config.ts`) pela role do usuário
- Roles disponíveis: `operador`, `gerente`, `admin`
- Items visíveis variam por role (ex.: cotação e campanhas só para gerente/admin)
- Footer com botão "Sair" que limpa `useAuthStore`, `useFilialStore`, `useRoleStore` e navega para `/login`

### Topbar — `src/react/app/layout/AppTopbar.tsx`

- Contém apenas `<FilialSwitcher />` — sem título de página, sem links cruzados
- `FilialSwitcher` em `src/react/app/filial/FilialSwitcher.tsx`

---

## 5. Componentes compartilhados encontrados

**Arquivo de exportação:** `src/react/shared/ui/index.ts`

| Componente | Arquivo | Props principais | Status | Observação |
|---|---|---|---|---|
| `PageHeader` | `shared/ui/PageHeader.tsx` | `title`, `description?`, `kicker?`, `actions?`, `meta?` | Ativo | Usado por ~8 módulos |
| `FilterBar` | `shared/ui/FilterBar.tsx` | `search?`, `filters[]?`, `onClearFilters?`, `activeFilterCount?`, `actions?`, `children?` | Ativo — revisado 2026-04-28 | Usado por Clientes, Produtos, Contas Receber |
| `DataTable` | `shared/ui/DataTable.tsx` | `columns`, `data/rows`, `onRowClick?`, `renderActions?`, paginação | Ativo | Usado por Clientes, Analytics |
| `ActionMenu` | `shared/ui/ActionMenu.tsx` | `items[]`, `label?`, `align?`, `buttonTestId?` | Ativo | Usado por Clientes |
| `Drawer` | `shared/ui/Drawer.tsx` | `open`, `title?`, `subtitle?`, `action?`, `onClose`, `size?`, `loading?`, `closeOnEsc?` | Ativo — revisado 2026-04-28 | Usado por Clientes; Pedidos usa CSS próprio |
| `Modal` | `shared/ui/Modal.tsx` | `open`, `title?`, `footer?`, `onClose`, `closeOnOverlay?` | Ativo | Usado por Contas Receber; Campanhas usa CSS próprio |
| `StatusBadge` | `shared/ui/StatusBadge.tsx` | `children`, `tone?` (neutral/info/success/warning/danger) | Ativo | Usado por ~5 módulos |
| `EmptyState` | `shared/ui/EmptyState.tsx` | `title`, `description?`, `action?`, `compact?` | Ativo | Usado amplamente |
| `LoadingState` | `shared/ui/LoadingState.tsx` | `title?`, `description?`, `compact?` | Ativo | Pouco usado (Clientes usa sk-card/sk-line) |
| `ErrorState` | `shared/ui/ErrorState.tsx` | `title?`, `description?`, `action?`, `compact?` | Ativo | Pouco usado |
| `StatCard` | `shared/ui/StatCard.tsx` | `label`, `value`, `foot?`, `tone?` | Ativo | Usado por Dashboard, Contas Receber, Campanhas, Filiais |
| `FormSection` | `shared/ui/FormSection.tsx` | `title`, `description?`, `aside?`, `children` | Ativo | Usado por Estoque |
| `FormField` | `shared/ui/FormField.tsx` | `label`, `htmlFor?`, `required?`, `hint?`, `error?`, `disabled?`, `children` | Ativo — revisado 2026-04-28 | `disabled` é visual apenas (opacity + pointer-events) |
| `FormError` | `shared/ui/FormError.tsx` | `message?`, `className?` | Ativo | — |
| `FormActions` | `shared/ui/FormActions.tsx` | `onCancel?`, `submitLabel?`, `cancelLabel?`, `loading?`, `disabled?`, `align?`, `children?` | **Criado 2026-04-28** | Padrão canônico de ações de formulário; `children` slot para layout customizado |

**Tipos exportados:** `DataTableColumn`, `StatusBadgeTone`, `ActionMenuItem`, `DrawerProps`, `FormActionsProps`

**Hooks compartilhados:**
- `src/react/shared/hooks/useKeyboardShortcuts.ts` — usado por `ClientesPilotPage`
- `src/react/shared/hooks/useAnalytics.ts` — criado 2026-04-28

---

## 6. Módulos encontrados

| Módulo | Arquivo principal | Componentes globais usados | Status visual | Risco |
|---|---|---|---|---|
| Dashboard | `DashboardPilotPage.tsx` (892 linhas) | `EmptyState`, `StatusBadge` | Sem `PageHeader` global — HTML próprio implícito | Alto — maior dívida visual |
| Clientes | `ClientesPilotPage.tsx` | `PageHeader`, `FilterBar`, `DataTable`, `ActionMenu`, `Drawer`, `EmptyState` | Referência — server-side pagination (2026-04-28) | Baixo |
| Pedidos | `PedidosPilotPage.tsx` → `PedidoListView` + `PedidoForm` + `PedidoDetailPanel` | `EmptyState` apenas na list view | Sem `PageHeader`, sem `Drawer` — usa `modal-shell-*` CSS próprio | Alto |
| Produtos | `ProdutosPilotPage.tsx` | `FilterBar`, `EmptyState`, `DataTable` | Server-side pagination (2026-04-28); `ProdutoDeleteConfirmModal` adicionado | Médio |
| Estoque | `EstoquePage.tsx` | `EmptyState`, `FormSection` | `EstoqueAdjustConfirmModal` adicionado (2026-04-28); usa `EstoquePageHeader` local | Médio |
| Contas Receber | `ContasReceberPilotPage.tsx` (771 linhas) | `FilterBar`, `Modal`, `StatCard`, `EmptyState` | `ContaReceberConfirmModal` adicionado; sem `PageHeader` | Alto |
| Cotação | `CotacaoPage.tsx` | `PageHeader`, `StatusBadge`, `EmptyState` | OK — multi-tabs (Fornecedores, Import, Tabela) | Médio |
| RCAs | `RcasPage.tsx` | `PageHeader`, `EmptyState` | CSS próprio (`rrow`, `rf-rca-*`) — sem DataTable | Médio |
| Relatórios | `RelatoriosPage.tsx` | `PageHeader`, `EmptyState` | 3 tabs com lógica própria de tabelas | Médio |
| Campanhas | `CampanhasPage.tsx` | `PageHeader`, `StatCard` (import direto por path) | Usa `CampanhaModal` com `modal-overlay` CSS próprio | Médio |
| Analytics | `AnalyticsPage.tsx` | `DataTable`, `StatCard` | Dados mock — sem API real | Baixo |
| Filiais | `FiliaisPage.tsx` | `PageHeader`, `EmptyState`, `StatCard` | OK — usa `FilialModal` (com `Modal` global) | Baixo |
| Acessos | `AcessosRoutePage.tsx` | Nenhum — HTML manual | Placeholder — em implantação | Baixo |
| Auth | `LoginPage.tsx` | Nenhum | Própria — sem shared/ui | — |
| Setup | `SetupPage.tsx` | Nenhum | Própria — sem shared/ui | — |

---

## 7. Integração com dados/API/Supabase

**Padrão uniforme em todos os módulos:**

```
getSupabaseConfig() → { url, key }
useAuthStore → session.access_token
useFilialStore → filialId

contexto: { url, key, token: session.access_token, filialId }
↓
fetch direto ao Supabase REST/RPC com headers apikey + Authorization
AbortSignal com timeout (padrão do legado: 12–15s)
```

**Configuração (`src/react/app/supabaseConfig.ts`):**
1. Lê `window.__SC_SUPABASE_URL__` / `window.__SC_SUPABASE_KEY__` (injetados pelo `index.html`)
2. Fallback: `localStorage` com chaves `sc_supabase_url` / `sc_supabase_key`
3. Fallback final: valores hardcoded em `supabaseConfig.ts` (apenas em dev com `__SC_ALLOW_LEGACY_SUPABASE_DEFAULTS__`)

**Stores globais de auth:**
- `useAuthStore` — sessão em `localStorage` chave `sc_auth_session_v1`
- `useFilialStore` — filial selecionada em `localStorage` chave `sc_filial_id`
- `useRoleStore` — role em memória (não persistido)

**Padrão de hook de dados:**
```
useXxxData.ts → lê store + config → chama xxxApi.ts → popula useXxxStore
```

**Serviços de API por módulo:**

| Módulo | Arquivo de API | Padrão |
|---|---|---|
| Auth | `auth/services/authApi.ts` | REST Auth Supabase |
| Clientes | `clientes/services/clientesApi.ts` + notasApi, fidelidadeApi, pedidosApi | REST + RPC |
| Pedidos | `pedidos/services/pedidosApi.ts` + clientesLightApi, produtosApi, rcasApi, contasReceberApi | REST |
| Produtos | `produtos/services/produtosApi.ts` | REST |
| Estoque | `estoque/services/estoqueApi.ts` | REST + RPC |
| Contas Receber | `contas-receber/services/contasReceberApi.ts` | REST |
| Cotação | `cotacao/services/cotacaoApi.ts` + cotacaoImportService | REST |
| RCAs | `rcas/services/rcasApi.ts` | REST |
| Relatórios | `relatorios/services/relatoriosApi.ts` | RPC |
| Campanhas | `campanhas/services/campanhasApi.ts` | REST |
| Dashboard | `dashboard/services/dashboardApi.ts` | REST |
| Filiais | `filiais/services/filiaisApi.ts` | REST |

**Bridge de mensagens legado:** `src/react/app/legacy/bridgeMessaging.ts` — usado por Clientes, Pedidos, Contas Receber para integração com shell legado (ainda ativo).

---

## 8. Migrations e banco

**Local:** `sql/` — 16 arquivos com numeração sequencial

| Arquivo | Tema |
|---|---|
| `01_schema_alignment.sql` | Alinhamento inicial de schema |
| `01b_rls_anon_dev.sql` | RLS para dev local — **NUNCA aplicar em produção** |
| `02_rls_producao.sql` | RLS produção |
| `03_rbac_v1.sql` | RBAC v1 |
| `03b_rbac_seed_e_auditoria.sql` | Seed e auditoria RBAC |
| `04_rbac_v2_admin_only.sql` | RBAC v2 admin |
| `04b_rbac_v2_validacao.sql` | Validação RBAC v2 |
| `05_rbac_auditoria_acessos.sql` | Auditoria de acessos |
| `05b_validacao_fase_1_rls_rbac.sql` | Validação fase 1 |
| `06_acessos_admin_email_lookup.sql` | Lookup de email para admin |
| `07_pedidos_venda_fechada.sql` | Pedidos venda fechada |
| `08_pedidos_cliente_id.sql` | FK cliente em pedidos |
| `09_acessos_user_snapshot.sql` | Snapshot de usuário |
| `10_clientes_identidade_unica.sql` | Identidade única de clientes |
| `11_cliente_fidelidade.sql` | Programa de fidelidade |
| `12_rcas_cliente_pedido.sql` | RCAs em cliente e pedido |
| `13_contas_receber.sql` | Módulo contas a receber |
| `14_produto_variantes.sql` | Variantes de produto |
| `15_contas_receber_baixas_parciais.sql` | Baixas parciais |
| `16_contas_receber_backend_consistencia.sql` | Consistência backend CR |

**Ordem obrigatória de aplicação:** 01 → 02 → 03 → 04 → 05 (01b apenas dev local).

---

## 9. Documentos de governança encontrados

| Documento | Localização | Finalidade |
|---|---|---|
| `NORTE.md` | `docs/` | Estado atual e roadmap — ler primeiro |
| `ADR_TEMPLATE.md` | `docs/arquitetura/` | Template para decisões de arquitetura |
| `TYPESCRIPT_GRADUAL.md` | `docs/arquitetura/` | Estratégia de tipagem gradual |
| `BACKEND_GOVERNANCA_E_EVOLUCAO_2026-04-07.md` | `docs/backend/` | Governança e evolução do backend |
| `CHECKLIST_RBAC_IMPLANTACAO.md` | `docs/backend/` | Checklist de implantação RBAC |
| `CONTRATO_MINIMO_SB_V1.md` | `docs/backend/` | Padrão de erro e retorno Supabase |
| `RBAC_MATRIZ_PERMISSOES_2026-04-07.md` | `docs/backend/` | Matriz de permissões por role |
| `AUDITORIA_INCONSISTENCIAS.md` | `docs/design-system/` | Inconsistências visuais mapeadas |
| `GOVERNANCA_VISUAL.md` | `docs/design-system/` | Regras de identidade visual |
| `UI_COMPONENTS.md` | `docs/design-system/` | Documentação de componentes UI |
| `FEEDBACK_ERROS_PADRAO_V1.md` | `docs/feedback/` | Padrões de mensagem de erro |
| `BACKLOG_DEBT_CONTROL_UX_UI.md` | `docs/governanca/` | Backlog de débito UX/UI |
| `BASELINE_TECNICO_ATUAL.md` | `docs/governanca/` | Este documento |
| `CHECKLIST_EXECUCAO_FASES_3_E_4.md` | `docs/governanca/` | Checklist de execução |
| `CHECKLIST_EXECUCAO_UX_E_PRODUTO_2026-04-21.md` | `docs/governanca/` | Checklist UX e produto |
| `CODE_REVIEW_CHECKLIST.md` | `docs/governanca/` | Gate obrigatório em todo PR |
| `COVERAGE_THRESHOLD_PROPOSTA.md` | `docs/governanca/` | Proposta de thresholds de cobertura |
| `ENGINEERING_POLICY.md` | `docs/governanca/` | Política de qualidade, tipagem e commits |
| `GOVERNANCA_SQL_RLS.md` | `docs/governanca/` | Regras obrigatórias para SQL novo |
| `PLANO_FECHAMENTO_BLOCOS_1_A_4_2026-04-21.md` | `docs/governanca/` | Plano de fechamento de blocos |
| `PLANO_REMOCAO_LEGADO.md` | `docs/governanca/` | Checklist de migração React por módulo |
| `PLANO_SPRINT_UX_E_PRODUTO_2026-04-21.md` | `docs/governanca/` | Plano de sprint UX e produto |
| `STATUS_REAL_ENTREGAS_E_PENDENCIAS_2026-04-23.md` | `docs/governanca/` | Status real de entregas (2026-04-23 — **supersedido por STATUS_REAL_2026-04-28.md**) |
| `STATUS_REAL_2026-04-28.md` | `docs/governanca/` | Status real atual — snapshot de 2026-04-28 |
| `INVENTARIO_COMPONENTES_COMPARTILHADOS.md` | `docs/governanca/` | Mapa de todos os shared/ui — guia de uso |
| `CHECKLIST_PR_FRONT_BACK_UX.md` | `docs/governanca/` | Gate obrigatório em todo PR (34 itens) |
| `ABORDAGEM_CLIENTES_SERVER_SIDE.md` | `docs/governanca/` | Decisão de server-side para Clientes |
| `ABORDAGEM_PRODUTOS_SERVER_SIDE.md` | `docs/governanca/` | Decisão de server-side para Produtos |
| `ABORDAGEM_PEDIDOS_SERVER_SIDE.md` | `docs/governanca/` | Abordagem de server-side para Pedidos |
| `MAPEAMENTO_MODULO_PEDIDOS.md` | `docs/governanca/` | Todos os arquivos e fluxo de dados de Pedidos |
| `MAPEAMENTO_MODULO_CONTAS_RECEBER.md` | `docs/governanca/` | Todos os arquivos e fluxo de dados de Contas Receber |
| `MAPEAMENTO_MODULO_ESTOQUE.md` | `docs/governanca/` | Todos os arquivos e fluxo de dados de Estoque |
| `MAPEAMENTO_AUDITORIA_ACOES_CRITICAS.md` | `docs/governanca/` | Auditoria de ações críticas por módulo |
| `MATRIZ_PERMISSOES.md` | `docs/governanca/` | Estado real de permissões — RBAC × guards × RLS |
| `CHECKLIST_RELEASE_UX_UI.md` | `docs/release/` | Checklist de release |
| `CRITERIO_ACEITE_UX_UI_POR_FEATURE.md` | `docs/release/` | Critério de aceite por feature |

---

## 10. Componentes duplicados ou suspeitos

### Dead code confirmado

| Arquivo | Motivo |
|---|---|
| `src/react/app/layout/AppContent.tsx` | Zero consumidores — nunca importado em nenhum arquivo |
| `src/react/app/navigation/pageMeta.ts` | Só consumido por `usePageMeta.ts`, que também não tem consumidores |
| `src/react/app/hooks/usePageMeta.ts` | Zero consumidores — AppTopbar foi simplificado para FilialSwitcher apenas |
| `src/react/app/hooks/useRouteState.ts` | Zero consumidores confirmados no código lido |
| `src/app/main.js` e toda a pasta `src/app/`, `src/features/`, `src/shared/` (legado JS) | Não carregados pelo `index.html` — mortos em runtime |

### Componentes substituídos mas ainda existentes

| Arquivo | Situação |
|---|---|
| `src/react/features/clientes/components/ClienteListView.tsx` (168 linhas) | Não usado por `ClientesPilotPage` — substituído por `DataTable` global. Ainda tem `ClienteListView.test.tsx` com 17+ testes próprios |
| `src/react/features/clientes/components/ClienteCard.tsx` (163 linhas) | Só usado dentro de `ClienteListView.tsx` — igualmente substituído. Tem `ClienteCard.test.tsx` com 20+ testes |

### Duplicação de padrão de Modal

| Componente | Usa `Modal` global? | Padrão usado |
|---|---|---|
| `Contas Receber (BaixaParcialModal)` | Sim | `<Modal>` global |
| `Cotação (ImportMapModal)` | Não confirmado | [NÃO CONFIRMADO] |
| `Campanhas (CampanhaModal)` | Não | `modal-overlay`/`modal-box` CSS próprio |
| `Campanhas (WhatsAppPreviewModal)` | Não | `modal-overlay`/`modal-box` CSS próprio |
| `Estoque (EstoqueMovementModal, EstoqueDeleteConfirmModal)` | Não confirmado | [NÃO CONFIRMADO] |

### Duplicação de padrão de Drawer / Panel de detalhe

| Componente | Usa `Drawer` global? | Padrão usado |
|---|---|---|
| `ClientesPilotPage` | Sim | `<Drawer>` global |
| `PedidoForm` (406 linhas) | Não | `modal-shell-*` CSS próprio |
| `PedidoDetailPanel` (494 linhas) | Não | `modal-shell-*` CSS próprio |
| `ProdutoDetailPanel` | Não confirmado | [NÃO CONFIRMADO] |

### Inconsistências de importação

| Arquivo | Problema |
|---|---|
| `src/react/features/campanhas/components/CampanhasPage.tsx` | Importa `PageHeader` e `StatCard` por path direto (`../../../shared/ui/PageHeader`) em vez de via barrel index |
| `src/react/features/acessos/pages/AcessosRoutePage.tsx` | Renderiza `div.rf-ui-page-header` como HTML manual em vez de usar `<PageHeader>` |

### Dependência fora de `src/react/`

| Arquivo | Dependência |
|---|---|
| `src/react/features/clientes/store/useClienteStore.ts` | Importa `filter.ts` e `ClienteFiltro` de `src/pilot/clientes/filter` — única dependência ativa no código React que aponta para fora de `src/react/` |

---

## 11. Riscos principais

| # | Risco | Impacto | Módulo |
|---|---|---|---|
| 1 | `ClienteListView` + `ClienteCard` ainda existem com testes próprios — cria ambiguidade sobre o que é canônico para listagem de clientes | Médio — confusão em PR review | Clientes |
| 2 | `src/pilot/clientes/filter.ts` importado por `useClienteStore` — único arquivo React que tem dependência fora de `src/react/` | Baixo — funcional, mas impede remoção segura do diretório `src/pilot/` | Clientes |
| 3 | `PedidoForm` e `PedidoDetailPanel` usam CSS `modal-shell-*` próprio, não `Drawer` global — comportamentos diferentes (Escape, overlay, scroll) | Alto — inconsistência UX e dívida de manutenção | Pedidos |
| 4 | `DashboardPilotPage` tem 892 linhas sem PageHeader global e com toda lógica de cálculo inline | Alto — dívida de leitura e refatoração | Dashboard |
| 5 | `CampanhaModal` e `WhatsAppPreviewModal` usam `modal-overlay` CSS direto sem `Modal` global — sem gestão de Escape/focotrap padronizado | Médio — inconsistência UX | Campanhas |
| 6 | `src/styles/style.css` é canônico mas React acessa via `src/react/styles.css` com `@import` — 2 arquivos para manter sincronizados | Baixo — pode causar confusão em futuras edições de CSS |Global |
| 7 | Dead code: `AppContent.tsx`, `usePageMeta.ts`, `useRouteState.ts`, `pageMeta.ts` — aumenta superfície cognitiva sem valor | Baixo — não tem impacto em runtime | App layer |
| 8 | `AcessosRoutePage` renderiza HTML manual de page header sem usar `<PageHeader>` — quebra consistência visual se PageHeader mudar | Baixo — módulo é placeholder | Acessos |
| 9 | `analytics/` usa dados mock hardcoded — não tem API real | Médio — aparência de feature funcional mas sem dado real | Analytics |
| 10 | Bridge messaging legado (`subscribeLegacyBridgeMessages`) ainda ativo em Clientes, Pedidos, Contas Receber — removê-lo prematuramente quebra integração com shell | Alto — dependência de runtime ainda necessária | Clientes, Pedidos, CR |

---

## 12. Recomendações imediatas

Ordenadas por relação custo/benefício (menor esforço, maior impacto primeiro):

| # | Recomendação | Esforço | Impacto |
|---|---|---|---|
| 1 | Corrigir `CampanhasPage.tsx` para importar via barrel (`from '../../../shared/ui'`) em vez de path direto | Mínimo (2 linhas) | Baixo — consistência |
| 2 | Migrar `AcessosRoutePage.tsx` para usar `<PageHeader>` componente | Mínimo (~10 linhas) | Baixo — consistência |
| 3 | Deletar `AppContent.tsx`, `usePageMeta.ts`, `useRouteState.ts`, `pageMeta.ts` após confirmar zero consumidores via typecheck | Mínimo | Médio — reduz ruído cognitivo |
| 4 | Mover `filterClientes` e `ClienteFiltro` de `src/pilot/clientes/filter.ts` para dentro de `src/react/features/clientes/` | Pequeno | Médio — remove única dependência fora de src/react/ |
| 5 | Deletar `ClienteListView.tsx`, `ClienteCard.tsx` e seus testes após confirmar que são realmente dead code | Pequeno (com cuidado nos testes) | Médio — clareza sobre o que é canônico |
| 6 | Migrar `CampanhaModal` e `WhatsAppPreviewModal` para usar `<Modal>` global | Médio | Médio — padroniza gestão de keyboard/overlay |
| 7 | Refatorar `DashboardPilotPage` (892 linhas) para usar `PageHeader` global e extrair lógica de cálculo para hooks | Alto | Alto — maior dívida de leitura |
| 8 | Migrar `PedidoForm` e `PedidoDetailPanel` para usar `<Drawer>` global | Alto | Alto — padroniza comportamento UX e reduz CSS morto |
| 9 | Implementar `AcessosRoutePage` com funcionalidade real (gestão de perfis, convites, auditoria) | Muito alto | Alto — módulo ainda é placeholder |
| 10 | Substituir dados mock de `AnalyticsPage` por API real | Alto | Médio — funcionalidade atualmente decorativa |
