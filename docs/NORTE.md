# Norte do Projeto — Sistema Comercial

**Atualizado em:** 2026-04-29

Este é o documento central. Ele descreve o estado real do sistema, o que estamos fazendo agora e onde encontrar cada referência ativa. Qualquer doc que não esteja listado aqui foi cancelado.

---

## Estado atual do sistema

### Módulos React (migration status)

| Módulo | Status | Próxima ação |
|--------|--------|-------------|
| Dashboard | React-only — shell removido (2026-04-21) | Refatorar 892 linhas (alta dívida visual) |
| Clientes | React-only — shell removido, server-side pagination (2026-04-28) | Nenhuma |
| Pedidos | React-only — legado é stub vazio | Migrar de `modal-shell-*` para Drawer global |
| Contas Receber | React-only — shell removido (2026-04-21) | Validar RPCs em ambiente real |
| Produtos | React-only — shell legado removido (2026-04-29) | Nenhuma |
| Estoque | React-only — shell legado removido (2026-04-29) | Nenhuma |
| Cotação | Legado puro — sem React equivalente | Fase 2 da migração |
| Relatórios | Legado puro — sem React equivalente | Fase 2 da migração |
| RCAs / Oportunidades | Legado puro — baixa complexidade | Fase 2 da migração |
| Campanhas | Legado puro — maior complexidade | Fase 2 da migração (última) |

### RBAC / Backend

| Item | Status |
|------|--------|
| RLS de produção (`02_rls_producao.sql`) | Aplicado |
| RBAC v1 + seed (`03`, `03b`) | Aplicado |
| Matriz de permissões publicada | Aplicada |
| RBAC v2 admin-only (`04_rbac_v2_admin_only.sql`) | **Pendente em produção** |
| Auditoria RBAC (`05_rbac_auditoria_acessos.sql`) | **Pendente em produção** |
| Edge Functions (campanhas, acessos-admin) | **Não deployadas** |

### UI Shared Components

| Componente | Status |
|------------|--------|
| PageHeader, FilterBar, DataTable, ActionMenu | Ativos |
| Drawer | Ativo — revisado 2026-04-28 (size, loading, closeOnEsc, aria-labelledby) |
| Modal, StatusBadge, EmptyState, LoadingState, ErrorState | Ativos |
| StatCard, FormSection, FormField | Ativos — FormField ganhou `disabled` em 2026-04-28 |
| FormActions | **Criado 2026-04-28** — padrão canônico de ações de formulário |
| FormError | Ativo |

---

## O que estamos fazendo agora

### Concluído nesta rodada (2026-04-28)

- **Server-side pagination** — Clientes e Produtos migrados de client-side para server-side
- **Confirm modals** — `ClienteDeleteConfirmModal`, `ContaReceberConfirmModal`, `EstoqueAdjustConfirmModal`, `ProdutoDeleteConfirmModal`
- **UI Components** — FilterBar (`onClearFilters`, `activeFilterCount`), Drawer (size/loading/closeOnEsc/aria), FormField (`disabled`), FormActions (novo)
- **Mapeamentos** — Pedidos, Contas Receber, Estoque, Auditoria de Ações Críticas
- **Analytics hook** — `useAnalytics.ts` em shared/hooks
- **Governança** — INVENTARIO_COMPONENTES_COMPARTILHADOS, CHECKLIST_PR_FRONT_BACK_UX reescritos; MATRIZ_PERMISSOES publicada

### Pendente imediato

1. **Validar RPCs** em ambiente real: `rpc_registrar_baixa`, `rpc_estornar_baixa`, `rpc_marcar_conta_pendente`
2. **Aplicar RBAC v2 + Auditoria** em produção (`sql/04` e `sql/05`)
3. **Rodar CI** — lint, typecheck, test:react em ambiente com Node/npm

---

## Documentos ativos

### Roadmap e execução

| Documento | Para que serve |
|-----------|---------------|
| [governanca/PLANO_REMOCAO_LEGADO.md](governanca/PLANO_REMOCAO_LEGADO.md) | Checklists granulares por módulo para remoção do legado |
| [governanca/STATUS_REAL_2026-04-28.md](governanca/STATUS_REAL_2026-04-28.md) | Estado real do sistema — snapshot desta data |

### Componentes e arquitetura front

| Documento | Para que serve |
|-----------|---------------|
| [governanca/INVENTARIO_COMPONENTES_COMPARTILHADOS.md](governanca/INVENTARIO_COMPONENTES_COMPARTILHADOS.md) | Mapa de todos os shared/ui — o que usar e o que não criar |
| [governanca/ABORDAGEM_CLIENTES_SERVER_SIDE.md](governanca/ABORDAGEM_CLIENTES_SERVER_SIDE.md) | Decisão de migração Clientes para server-side |
| [governanca/ABORDAGEM_PRODUTOS_SERVER_SIDE.md](governanca/ABORDAGEM_PRODUTOS_SERVER_SIDE.md) | Decisão de migração Produtos para server-side |
| [governanca/ABORDAGEM_PEDIDOS_SERVER_SIDE.md](governanca/ABORDAGEM_PEDIDOS_SERVER_SIDE.md) | Decisão de abordagem Pedidos |

### Mapeamentos de módulo

| Documento | Para que serve |
|-----------|---------------|
| [governanca/MAPEAMENTO_MODULO_PEDIDOS.md](governanca/MAPEAMENTO_MODULO_PEDIDOS.md) | Todos os arquivos e fluxo de dados de Pedidos |
| [governanca/MAPEAMENTO_MODULO_CONTAS_RECEBER.md](governanca/MAPEAMENTO_MODULO_CONTAS_RECEBER.md) | Todos os arquivos e fluxo de dados de Contas Receber |
| [governanca/MAPEAMENTO_MODULO_ESTOQUE.md](governanca/MAPEAMENTO_MODULO_ESTOQUE.md) | Todos os arquivos e fluxo de dados de Estoque |
| [governanca/MAPEAMENTO_AUDITORIA_ACOES_CRITICAS.md](governanca/MAPEAMENTO_AUDITORIA_ACOES_CRITICAS.md) | Auditoria das ações críticas por módulo |

### Backend e banco

| Documento | Para que serve |
|-----------|---------------|
| [backend/CHECKLIST_RBAC_IMPLANTACAO.md](../backend/CHECKLIST_RBAC_IMPLANTACAO.md) | 4 itens de RBAC ainda pendentes em produção |
| [governanca/MATRIZ_PERMISSOES.md](governanca/MATRIZ_PERMISSOES.md) | Estado real de permissões — RBAC × guards × RLS |
| [backend/CONTRATO_MINIMO_SB_V1.md](../backend/CONTRATO_MINIMO_SB_V1.md) | Contrato do layer SB — padrão de erro e retorno |
| [governanca/GOVERNANCA_SQL_RLS.md](governanca/GOVERNANCA_SQL_RLS.md) | Regras obrigatórias para qualquer SQL novo |

### Engenharia e qualidade

| Documento | Para que serve |
|-----------|---------------|
| [governanca/ENGINEERING_POLICY.md](governanca/ENGINEERING_POLICY.md) | Política de engenharia — tipagem, qualidade, commits, segurança |
| [governanca/CHECKLIST_PR_FRONT_BACK_UX.md](governanca/CHECKLIST_PR_FRONT_BACK_UX.md) | Gate obrigatório em todo PR (front + back + UX) |
| [governanca/BASELINE_TECNICO_ATUAL.md](governanca/BASELINE_TECNICO_ATUAL.md) | Auditoria técnica completa do codebase |
| [arquitetura/TYPESCRIPT_GRADUAL.md](../arquitetura/TYPESCRIPT_GRADUAL.md) | Estratégia de adoção gradual de TypeScript |
| [governanca/COVERAGE_THRESHOLD_PROPOSTA.md](governanca/COVERAGE_THRESHOLD_PROPOSTA.md) | Thresholds de cobertura por fase (ativo no CI) |

### UX e release

| Documento | Para que serve |
|-----------|---------------|
| [release/CHECKLIST_RELEASE_UX_UI.md](../release/CHECKLIST_RELEASE_UX_UI.md) | Gate obrigatório antes de qualquer release com UI |
| [release/CRITERIO_ACEITE_UX_UI_POR_FEATURE.md](../release/CRITERIO_ACEITE_UX_UI_POR_FEATURE.md) | Critério de aceite por feature de produto |
| [design-system/GOVERNANCA_VISUAL.md](../design-system/GOVERNANCA_VISUAL.md) | Regras de design system — o que usar e o que evitar |
| [feedback/FEEDBACK_ERROS_PADRAO_V1.md](../feedback/FEEDBACK_ERROS_PADRAO_V1.md) | Padrão de mensagens de erro para o usuário |

---

## Regras que não mudam

- Todo PR passa pelo `CHECKLIST_PR_FRONT_BACK_UX.md`
- Todo SQL novo segue a `GOVERNANCA_SQL_RLS.md`
- Toda feature com UI passa pelo `CHECKLIST_RELEASE_UX_UI.md`
- Nenhuma regra de negócio financeira fica só no frontend
- Commits seguem o padrão `feat/fix/refactor/docs(escopo): mensagem`
- Shared/ui: consultar INVENTARIO antes de criar componente novo
- Novo módulo React = documenta abordagem → valida → remove legado

---

## Próximas frentes (após remoção dos legados restantes)

| Ordem | Frente | Estimativa |
|-------|--------|-----------|
| 1 | Aplicar RBAC v2 + Auditoria em produção | Imediato |
| 2 | Validar RPCs de Contas Receber em ambiente real | Imediato |
| 3 | React: Cotação | Mês 1 |
| 4 | React: RCAs + Relatórios | Mês 1–2 |
| 5 | React: Campanhas | Mês 2–3 |
| 6 | Remover infraestrutura bridge (`src/legacy/`) | Após fase 6 |
| 7 | CI com lint + typecheck + testes em branch protection | Antes de fase 6 |
