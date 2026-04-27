# Auditoria de Inconsistências Visuais — pós UX-7

Data: 2026-04-27
Escopo: frontend React completo após rodadas UX-1 a UX-7

Itens marcados como **CORRIGIDO** foram tratados nesta ou em rodadas anteriores.
Itens abertos são débito mapeado — corrigir por prioridade nas próximas sprints de polish.

---

## Prioridade alta

### A1 — Modal legado em ContasReceberPilotPage
- **Arquivo:** `src/react/features/contas-receber/components/ContasReceberPilotPage.tsx:503`
- **Problema:** usa `modal-wrap`/`modal-bg` manual em vez do `<Modal>` compartilhado
- **Impacto:** sem Escape key, sem `aria-modal`, overflow não controlado
- **Esforço:** médio — a seção de baixa parcial é uma função interna (~60 linhas) que precisa ser extraída para componente próprio antes de migrar o modal
- **Status:** aberto

### A2 — `div.empty` em PedidoForm (estados de loading/erro)
- **Arquivo:** `src/react/features/pedidos/components/PedidoForm.tsx:171,176`
- **Problema:** usa `<div className="empty">` em vez de `<EmptyState compact />`
- **Impacto:** inconsistente com o tratamento de estados no restante do módulo Pedidos
- **Esforço:** baixo
- **Status:** aberto

---

## Prioridade média

### M1 — Modal legado em RcaModal — **CORRIGIDO em UX-8**
- **Arquivo:** `src/react/features/rcas/components/RcaModal.tsx`
- **Status:** migrado para `<Modal>` compartilhado

### M2 — Modal legado em ValidacaoModal — **CORRIGIDO em UX-8**
- **Arquivo:** `src/react/features/relatorios/components/ValidacaoModal.tsx`
- **Status:** migrado para `<Modal>` compartilhado

### M3 — `bento-band`/`met` em Campanhas e Relatórios
- **Arquivos:**
  - `src/react/features/campanhas/components/CampanhasPage.tsx:102`
  - `src/react/features/relatorios/components/ClientesTab.tsx:32`
  - `src/react/features/relatorios/components/OportunidadesTab.tsx:111`
  - `src/react/features/relatorios/components/PerformanceTab.tsx:36`
- **Problema:** usa padrão legado de métricas em vez de `StatCard` em `rf-ui-stat-grid`
- **Impacto:** visual inconsistente em módulos de baixo tráfego
- **Esforço:** médio-alto — Relatórios tem vários sub-componentes densos
- **Status:** aberto

### M4 — `div.empty` em múltiplas sub-telas de Relatórios
- **Arquivos:** `ClientesTab.tsx:53,70`, `OportunidadesTab.tsx:213,237,258`, `PerformanceTab.tsx:57,74`, `RelatoriosPage.tsx:45`
- **Problema:** estados vazios improvisados em módulo read-only
- **Impacto:** baixo (módulo não é fluxo operacional principal)
- **Esforço:** médio — muitos arquivos, mas alterações mecânicas
- **Status:** aberto

### M5 — `bdg` manual para status de pedido em PedidoDetailPanel
- **Arquivo:** `src/react/features/pedidos/components/PedidoDetailPanel.tsx`
- **Problema:** usa `STATUS_BADGE` record com `.bdg bk/bb/ba/bg/br` para status semânticos de pedido, enquanto `PedidoRow` já usa `StatusBadge` para o mesmo pedido
- **Observação:** alguns `bdg` no painel são chips informativos (data, valor) — esses são aceitáveis
- **Esforço:** médio
- **Status:** aberto

### M6 — Pages PedidosPilotPage e ClientesPilotPage sem PageHeader
- **Arquivos:** `PedidosPilotPage.tsx`, `ClientesPilotPage.tsx`
- **Problema:** módulos sem título/descrição formal; usam stat-bars e surface-tabs customizadas no lugar
- **Avaliação:** é uma decisão arquitetural — esses módulos têm UI mais densa e integrada. Adicionar PageHeader implicaria reorganizar o layout
- **Esforço:** alto
- **Status:** débito arquitetural — decidir por sprint dedicado

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
