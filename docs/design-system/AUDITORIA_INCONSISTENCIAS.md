# Auditoria de Inconsistências Visuais — pós UX-7

Data: 2026-04-27
Escopo: frontend React completo após rodadas UX-1 a UX-7

Itens marcados como **CORRIGIDO** foram tratados nesta ou em rodadas anteriores.
Itens abertos são débito mapeado — corrigir por prioridade nas próximas sprints de polish.

---

## Prioridade alta

### A1 — Modal legado em ContasReceberPilotPage — **CORRIGIDO em UX-9**
- **Arquivo:** `src/react/features/contas-receber/components/ContasReceberPilotPage.tsx`
- **Status:** `BaixaParcialModal` migrado para `<Modal>` compartilhado (Escape key, `aria-modal`, overflow controlado, ordem Cancelar/Confirmar padronizada)

### A2 — `div.empty` em PedidoForm (estados de loading/erro) — **CORRIGIDO em UX-9**
- **Arquivo:** `src/react/features/pedidos/components/PedidoForm.tsx`
- **Status:** substituído por `<EmptyState compact />`

---

## Prioridade média

### M1 — Modal legado em RcaModal — **CORRIGIDO em UX-8**
- **Arquivo:** `src/react/features/rcas/components/RcaModal.tsx`
- **Status:** migrado para `<Modal>` compartilhado

### M2 — Modal legado em ValidacaoModal — **CORRIGIDO em UX-8**
- **Arquivo:** `src/react/features/relatorios/components/ValidacaoModal.tsx`
- **Status:** migrado para `<Modal>` compartilhado

### M3 — `bento-band`/`met` em Campanhas e Relatórios — **CORRIGIDO em UX-10**
- **Arquivos:**
  - `src/react/features/campanhas/components/CampanhasPage.tsx`
  - `src/react/features/relatorios/components/ClientesTab.tsx`
  - `src/react/features/relatorios/components/OportunidadesTab.tsx`
  - `src/react/features/relatorios/components/PerformanceTab.tsx`
- **Status:** `bento-band`/`met` substituídos por `StatCard` em `rf-ui-stat-grid` em todos os 4 arquivos

### M4 — `div.empty` em múltiplas sub-telas de Relatórios — **CORRIGIDO em UX-9**
- **Arquivos:** `ClientesTab.tsx`, `OportunidadesTab.tsx`, `PerformanceTab.tsx`, `RelatoriosPage.tsx`
- **Status:** todos os estados vazios e de loading substituídos por `<EmptyState compact />`

### M5 — `bdg` manual para status de pedido em PedidoDetailPanel — **CORRIGIDO em UX-9**
- **Arquivo:** `src/react/features/pedidos/components/PedidoDetailPanel.tsx`
- **Status:** `STATUS_BADGE` record e `getContaStatusClass` substituídos por `STATUS_TONE` e `getContaStatusTone` usando `StatusBadge`. Chips informativos (data, valor) mantidos como `bdg` — correto.

### M6 — Pages PedidosPilotPage e ClientesPilotPage sem PageHeader — **DECIDIDO em UX-10**
- **Arquivos:** `PedidosPilotPage.tsx`, `ClientesPilotPage.tsx`
- **Decisão:** exceção arquitetural mantida. Ambas são páginas "pilot" embutidas num shell legado (`COMMAND_SOURCE = 'pedidos-legacy-shell'` / `'clientes-legacy-shell'`) que fornece o título da página. Adicionar `PageHeader` resultaria em título duplicado. Sem regressão visual — o padrão é intencional enquanto o shell legado existir.

---

## Prioridade baixa / débito aceitável

### B1 — `bdg` para chips informativos não-semânticos
- **Arquivos:** `ProdutoListView.tsx`, `ClienteSegmentView.tsx`, `PedidoRow.tsx`
- **Avaliação:** `.bdg bk/.bdg bb` usados para chips de categoria, contagem, modo atacado — não são status semânticos. `StatusBadge` não é a ferramenta certa para isso
- **Decisão:** débito aceitável — não migrar

### B2 — Inconsistência de `<main>` vs `<div>` como wrapper de page
- **Problema:** algumas pages usam `<main>`, outras `<div>` como elemento raiz com `rf-content`
- **Impacto:** semântico apenas, zero impacto visual
- **Decisão:** padronizar em `<main>` na próxima feature que tocar cada página

### B3 — `div.empty` em AppErrorBoundary e FilialProvider
- **Arquivos:** `src/react/app/ui/AppErrorBoundary.tsx`, `src/react/app/filial/FilialProvider.tsx`
- **Avaliação:** componentes de infraestrutura de app que inicializam antes dos componentes de UI. Dependência de `EmptyState` aqui seria circular
- **Decisão:** manter como está — justificado

### B4 — `bdg` em Campanhas e Relatórios para labels de urgência esportiva
- **Arquivos:** `CampanhasPage.tsx`, `OportunidadesTab.tsx`
- **Avaliação:** `.bdg br/.bdg ba/.bdg bb` para "Hoje" / "Esta semana" / "Validada" — equivalentes semânticos de `danger`/`warning`/`info`. Migrar junto com M3 quando Campanhas/Relatórios for revisado
- **Decisão:** aberto, baixa prioridade isolada

---

## Regra para novas inconsistências

Toda inconsistência encontrada fora do escopo de um PR vai nesta lista.
Não corrigir inline no PR corrente para não inflar scope.
Priorizar na próxima rodada de polish ou sprint de QA visual.
