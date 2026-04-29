# Status Real do Sistema — 2026-04-28

> Substitui `STATUS_REAL_ENTREGAS_E_PENDENCIAS_2026-04-23.md` como snapshot atual.  
> Gerado por auditoria de código + commits: `b5358ad`, `2f52849` e sessão de componentes UI.

---

## Resumo executivo

Esta data marca o encerramento de uma rodada longa de trabalho técnico que avançou em 4 frentes simultâneas: migração de módulos para React com server-side, criação e revisão de componentes UI compartilhados, documentação de governança e mapeamento de módulos críticos.

O sistema agora tem 6 dos 10 módulos de negócio em React (Clientes, Dashboard, Pedidos, Contas Receber, Produtos, Estoque). Os 4 restantes (Cotação, Relatórios, RCAs, Campanhas) ainda são legado puro.

---

## 1. Módulos — estado real

| Módulo | Status | Observação |
|--------|--------|-----------|
| Dashboard | React-only | Shell legado removido. 892 linhas — dívida de leitura alta. |
| Clientes | React-only | Server-side pagination implementada. ClienteDeleteConfirmModal adicionado. |
| Pedidos | React-only (stub) | Funcional, mas usa `modal-shell-*` CSS próprio em vez de Drawer global. |
| Contas Receber | React-only | ContaReceberConfirmModal adicionado. RPCs ainda não validados em ambiente real. |
| Produtos | React implementado | Server-side pagination. ProdutoDeleteConfirmModal adicionado. Legacy shell pendente de remoção. |
| Estoque | React implementado | EstoqueAdjustConfirmModal adicionado. Mapeamento completo documentado. Legacy shell pendente de remoção. |
| Cotação | Legado puro | Sem equivalente React. Fase 2. |
| Relatórios | Legado puro | Sem equivalente React. Fase 2. |
| RCAs / Oportunidades | Legado puro | Sem equivalente React. Fase 2. |
| Campanhas | Legado puro | Maior complexidade. Fase 2 — última. |

---

## 2. UI Shared Components — estado real

**Arquivo de exportação:** `src/react/shared/ui/index.ts`

| Componente | Status | Mudanças recentes |
|------------|--------|------------------|
| PageHeader | Ativo | Sem mudanças |
| FilterBar | Ativo | + `onClearFilters`, `activeFilterCount`, `label` em FilterConfig; defaults corrigidos para `inp`/`inp sel` |
| DataTable | Ativo | Sem mudanças — API auditada e considerada completa |
| ActionMenu | Ativo | Sem mudanças |
| Drawer | Ativo | + `size` (sm/md/lg), `loading`, `closeOnEsc`; `aria-labelledby` com `useId()`; `DrawerProps` exportado |
| Modal | Ativo | Sem mudanças |
| StatusBadge | Ativo | Sem mudanças |
| EmptyState | Ativo | Sem mudanças |
| LoadingState | Ativo | Sem mudanças — `compact` já existia |
| ErrorState | Ativo | Sem mudanças |
| StatCard | Ativo | Sem mudanças |
| FormSection | Ativo | Sem mudanças |
| FormField | Ativo | + `disabled` (visual: opacity + pointer-events) |
| FormError | Ativo | Sem mudanças |
| **FormActions** | **Criado** | Novo padrão canônico de ações de formulário (submit/cancel com loading/disabled/align) |

**Hook compartilhado novo:** `src/react/shared/hooks/useAnalytics.ts`

---

## 3. Backend / SQL — estado real

| Item | Status |
|------|--------|
| SQL 01–03b | Aplicados |
| SQL 04 (RBAC v2 admin-only) | **Pendente em produção** |
| SQL 05 (Auditoria de acessos) | **Pendente em produção** |
| SQL 06–16 | Aplicados |
| RPCs de Contas Receber | Implementados — não validados em ambiente real |
| Edge Functions | Não deployadas |

---

## 4. Governança — documentos criados ou revisados nesta rodada

| Documento | Ação | Data |
|-----------|------|------|
| `CHECKLIST_PR_FRONT_BACK_UX.md` | Reescrito — 34 itens, 4 seções | 2026-04-28 |
| `INVENTARIO_COMPONENTES_COMPARTILHADOS.md` | Reescrito — 15 componentes mapeados + guia de uso | 2026-04-28 |
| `ABORDAGEM_CLIENTES_SERVER_SIDE.md` | Criado | 2026-04-28 |
| `ABORDAGEM_PRODUTOS_SERVER_SIDE.md` | Criado | 2026-04-28 |
| `ABORDAGEM_PEDIDOS_SERVER_SIDE.md` | Criado | 2026-04-28 |
| `MAPEAMENTO_MODULO_PEDIDOS.md` | Criado | 2026-04-28 |
| `MAPEAMENTO_MODULO_CONTAS_RECEBER.md` | Criado | 2026-04-28 |
| `MAPEAMENTO_MODULO_ESTOQUE.md` | Criado | 2026-04-28 |
| `MAPEAMENTO_AUDITORIA_ACOES_CRITICAS.md` | Criado | 2026-04-28 |
| `MATRIZ_PERMISSOES.md` | Criado | 2026-04-28 |
| `BASELINE_TECNICO_ATUAL.md` | Criado — auditoria completa do codebase | 2026-04-28 |
| `STATUS_REAL_2026-04-28.md` | Este documento | 2026-04-28 |
| `NORTE.md` | Atualizado | 2026-04-28 |

---

## 5. Componentes novos no código (commits desta rodada)

| Componente | Módulo | Tipo |
|------------|--------|------|
| `ClienteDeleteConfirmModal.tsx` | Clientes | Confirm modal |
| `ContaReceberConfirmModal.tsx` | Contas Receber | Confirm modal |
| `EstoqueAdjustConfirmModal.tsx` | Estoque | Confirm modal |
| `ProdutoDeleteConfirmModal.tsx` | Produtos | Confirm modal |
| `FormActions.tsx` | shared/ui | Componente canônico |
| `useAnalytics.ts` | shared/hooks | Hook compartilhado |

---

## 6. Pendências reais

### Imediatas (próximo sprint)

- [ ] Remover shell legado de **Produtos** (React já implementado)
- [ ] Remover shell legado de **Estoque** (React já implementado)
- [ ] Aplicar `sql/04_rbac_v2_admin_only.sql` em produção
- [ ] Aplicar `sql/05_rbac_auditoria_acessos.sql` em produção
- [ ] Validar RPCs em ambiente real: `rpc_registrar_baixa`, `rpc_estornar_baixa`, `rpc_marcar_conta_pendente`
- [ ] Rodar CI completo (lint + typecheck + test:react) em ambiente com Node/npm

### Técnicas identificadas (débito, não bloqueiam)

- [ ] `PedidoForm` e `PedidoDetailPanel` usam `modal-shell-*` CSS próprio — migrar para `<Drawer>` global
- [ ] `CampanhaModal` e `WhatsAppPreviewModal` usam `modal-overlay` CSS direto — migrar para `<Modal>` global
- [ ] `DashboardPilotPage` tem 892 linhas — extrair lógica de cálculo para hooks
- [ ] `ClienteListView.tsx` e `ClienteCard.tsx` são dead code (substituídos por DataTable) — deletar
- [ ] `AppContent.tsx`, `usePageMeta.ts`, `useRouteState.ts`, `pageMeta.ts` — dead code confirmado
- [ ] `src/pilot/clientes/filter.ts` — única dependência de `src/react/` fora de `src/react/`; mover para dentro do feature

### Fase 2 — migração restante (roadmap)

| Módulo | Complexidade |
|--------|-------------|
| Cotação | Média — multi-tabs com import de planilha |
| RCAs / Oportunidades | Baixa |
| Relatórios | Média — 3 tabs com lógica de tabelas |
| Campanhas | Alta — WhatsApp, modais, templates |

---

## 7. Contraposição com STATUS anterior (2026-04-23)

| Item | 2026-04-23 | 2026-04-28 |
|------|-----------|-----------|
| Clientes | React-only, client-side | React-only, server-side |
| Produtos | Legado puro | React implementado, server-side |
| Estoque | Legado puro | React implementado |
| FormActions | Não existia | Criado — padrão canônico |
| Confirm modals | Não existiam | 4 módulos com confirm modal |
| INVENTARIO_COMPONENTES | Não existia | Mapeamento completo de 15 componentes |
| Mapeamentos de módulo | Não existiam | Pedidos, CR, Estoque mapeados |
| MATRIZ_PERMISSOES | Não existia | Documentada |

---

## Referências de commit

| Commit | Descrição |
|--------|-----------|
| `2f52849` | 66 arquivos — server-side pagination Clientes/Produtos, confirm modals, mapeamentos, analytics hook |
| `b5358ad` | Fechamento das pendências reais sem smoke |
| `ce1a133` | Revisão de governança |
