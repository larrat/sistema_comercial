# Auditoria de Inconsistências Visuais — UX-1 a UX-10

Data de abertura: 2026-04-27 | Fechada em: UX-11 (2026-04-27)
Escopo: frontend React completo após rodadas UX-1 a UX-10

Itens marcados como **CORRIGIDO** foram tratados nesta ou em rodadas anteriores.
Itens marcados como **DECIDIDO** foram avaliados e mantidos como exceção arquitetural documentada.
Itens na seção final são débito consciente aceito — não requerem correção.

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

### M6 — Pages PedidosPilotPage e ClientesPilotPage sem PageHeader — **PARCIALMENTE CORRIGIDO**
- **Arquivos:** `PedidosPilotPage.tsx`, `ClientesPilotPage.tsx`
- **ClientesPilotPage:** corrigido em refinamento pós-UX-11 — `PageHeader` adicionado com título "Clientes", descrição e CTA primário "Novo cliente". Formulário movido para `Drawer`; `ClienteDetailPanel` também em `Drawer`.
- **PedidosPilotPage:** exceção arquitetural mantida. Embutida em shell legado (`COMMAND_SOURCE = 'pedidos-legacy-shell'`) que fornece o título. Adicionar `PageHeader` resultaria em título duplicado. Sem regressão visual — o padrão é intencional enquanto o shell legado existir.

---

## Exceções aceitas e débito consciente

Itens abaixo foram avaliados e formalizados como exceção — não requerem sprint dedicado.

### B1 — `bdg` para chips informativos não-semânticos
- **Arquivos:** `ProdutoListView.tsx`, `ClienteSegmentView.tsx`, `PedidoRow.tsx`
- **Motivo:** `.bdg bk/.bdg bb` para chips de categoria, contagem, modo atacado — não são status semânticos. `StatusBadge` não é a ferramenta certa
- **Reavaliar:** se criado componente `InfoChip` ou similar em `shared/ui/`

### B2 — `<main>` vs `<div>` como wrapper de page
- **Motivo:** inconsistência semântica apenas, zero impacto visual
- **Reavaliar:** organicamente na próxima feature que tocar cada página

### B3 — `div.empty` em AppErrorBoundary e FilialProvider
- **Arquivos:** `src/react/app/ui/AppErrorBoundary.tsx`, `src/react/app/filial/FilialProvider.tsx`
- **Motivo:** inicializam antes dos componentes de UI — `EmptyState` aqui seria dependência circular
- **Reavaliar:** nunca — justificado por arquitetura

### B4 — `bdg` para labels de urgência esportiva em Campanhas e Oportunidades
- **Arquivos:** `CampanhasPage.tsx`, `OportunidadesTab.tsx`
- **Motivo:** `.bdg br/.bdg ba/.bdg bb` para "Hoje" / "Esta semana" / "Validada" — chips de urgência contextual, não status de entidade. `StatusBadge` resolve status; esses chips são UI de contexto
- **Reavaliar:** se criado componente `ContextBadge` para chips de urgência

### B5 — Classes de botão não-padronizadas — **CORRIGIDO em 2026-05-06**
- **Arquivos corrigidos:**
  - `src/react/features/campanhas/components/CampanhasPage.tsx` — `btn-ghost`/`btn-primary`/`btn-xs` → `btn btn-p`/`btn btn-sm`
  - `src/react/features/rcas/components/RcasPage.tsx` — padronizado durante refatoração para DataTable
  - `src/react/features/filiais/components/FilialCard.tsx` — `btn btn-xs btn-ghost` → `btn btn-sm`; `btn-xs btn-ghost tone-danger` → `btn btn-r btn-sm`
  - `src/react/features/dashboard/components/DashboardPilotPage.tsx` — 4 ocorrências de `btn btn-ghost btn-xs` → `btn btn-sm`
  - `src/react/features/clientes/components/ClientesPilotPage.tsx` — `btn btn-ghost btn-sm h-9` → `btn btn-sm h-9`
  - `src/react/app/ui/AppErrorBoundary.tsx` — `btn btn-ghost` → `btn btn-sm`
- **Status:** todas as ocorrências de `btn-ghost`/`btn-xs`/`btn-primary`/`btn-danger` eliminadas do codebase

### B6 — `window.confirm()` em confirmações destrutivas — **CORRIGIDO em 2026-05-06**
- **Arquivos corrigidos:**
  - `src/react/features/campanhas/components/CampanhasPage.tsx` — exclusão de campanha: `window.confirm` → `<Modal>` com estado `confirmarRemocao: Campanha | null`, botão `btn btn-r btn-sm`
  - `src/react/features/cotacao/components/CotacaoFornecedoresPage.tsx` — remoção de fornecedor: `window.confirm` removido do hook, confirmação movida para o componente com `<Modal>` + `btn btn-r btn-sm`
  - `src/react/features/cotacao/hooks/useCotacaoMutations.ts` — `window.confirm` removido de `removerFornecedor`
  - `src/react/features/estoque/components/EstoqueMovementModal.tsx` — saldo insuficiente: `window.confirm` → `<Modal>` com estado `saldoWarningOpen`, botão "Registrar assim mesmo" com `btn btn-r btn-sm`
  - `src/react/features/estoque/hooks/useEstoqueMutations.ts` — `window.confirm` removido de `saveMovement`
- **Status:** `window.confirm()` eliminado de todo o codebase

---

## Registro de novas inconsistências encontradas e corrigidas em 2026-05-06

Itens detectados durante auditoria abrangente do codebase React e corrigidos na mesma sessão.

### N1 — `div.rf-error-banner` em vez de `<ErrorState>` — **CORRIGIDO em 2026-05-06**
- **Arquivos:** `FiliaisPage.tsx`, `ContasReceberPilotPage.tsx`
- **Fix:** adicionado import `ErrorState`, substituído `<div className="rf-error-banner">` por `<ErrorState title={error} compact />`

### N2 — `div.empty` em FilaWhatsAppSection e HistoricoEnviosSection — **CORRIGIDO em 2026-05-06**
- **Arquivos:** `src/react/features/campanhas/components/FilaWhatsAppSection.tsx`, `HistoricoEnviosSection.tsx`
- **Fix:** estados vazios substituídos por `<EmptyState title="..." compact />`

### N3 — `bdg br/ba/bg` para status de estoque em ProdutoDetailPanel — **CORRIGIDO em 2026-05-06**
- **Arquivo:** `src/react/features/produtos/components/ProdutoDetailPanel.tsx`
- **Fix:** adicionado import `StatusBadge`; `bdg br` (Zerado) → `tone="danger"`, `bdg ba` (Baixo) → `tone="warning"`, `bdg bg` (OK) → `tone="success"`

---

## Status da trilha UX

A trilha de consolidação visual UX-1 a UX-10 foi encerrada na rodada UX-11 (2026-04-27).
A rodada de auditoria abrangente foi concluída em 2026-05-06.

- Todos os itens de prioridade alta foram corrigidos (A1, A2)
- Todos os itens de prioridade média foram corrigidos ou decididos (M1–M6)
- B5 e B6 corrigidos em 2026-05-06 (varredura de todo o codebase)
- N1, N2, N3 detectados e corrigidos em 2026-05-06
- Os itens B1–B4 são exceções formalizadas — não requerem correção

**Não há mais rodadas especiais de UX.** Toda manutenção futura segue `GOVERNANCA_VISUAL.md`.
