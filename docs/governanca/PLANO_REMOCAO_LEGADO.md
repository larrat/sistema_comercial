# Plano de Remoção do Sistema Legado

**Data:** 2026-04-21  
**Objetivo:** Eliminar todo código vanilla JS de features, shells HTML legados e infraestrutura de bridge, deixando apenas React + módulos de app (auth, nav, config).

---

## Estado atual (diagnóstico)

> **Revalidacao em 2026-04-23:** este plano passa a refletir o estado real apos o fechamento dos blocos 1 a 4. Smoke tests nao bloqueiam esta etapa; validacoes obrigatorias passam a ser lint, typecheck, testes React/unitarios e revisao documental. A remocao completa de legado continua como roadmap multi-sprint.

### Caminho principal React/bridge atual
| Módulo | Status |
|--------|--------|
| Clientes | React/bridge como caminho principal |
| Pedidos | React/bridge como caminho principal; `src/features/pedidos.js` e stub |
| Dashboard | React ativo na entrada; bridge ainda carregado de forma estatica |
| Contas Receber | React/bridge como caminho principal, com RPCs validadas em ambiente real |

### Legado puro (sem React equivalente)
| Módulo | Arquivo(s) | Complexidade |
|--------|-----------|--------------|
| Produtos | `produtos.js` | Média |
| Estoque | `estoque.js` | Alta |
| Cotação | `cotacao.js` + `cotacao/` | Alta |
| Relatórios | `relatorios.js` | Baixa |
| Campanhas | `campanhas/` (data, render, actions) | Alta |
| RCAs | `rcas.js` | Baixa |
| Oportunidades/Jogos | `oportunidades-jogos.js` | Baixa |

### Infraestrutura bridge (remover por último)
- `src/legacy/bridges/feature-flags.js`
- `src/legacy/bridges/bridge-contract.js`
- `src/legacy/bridges/storage-keys.js`
- bridge estatica do dashboard no `index.html`
- bridges sob demanda de clientes, pedidos e contas a receber

---

## Fase 1 — Fechar os híbridos
> Pré-requisito: SQL/RPCs de contas-receber validados em produção.  
> Ganho imediato: remove ~3 módulos JS + 3 shells HTML sem escrever feature nova.

### 1A — Flipar e remover Contas Receber
- [x] Revisar SQL `16_contas_receber_backend_consistencia.sql`
- [x] Confirmar decisão de negócio sobre `status vencido`
- [x] Implementar RPCs no código (`rpc_registrar_baixa`, `rpc_estornar_baixa`, `rpc_marcar_conta_pendente`)
- [x] Aplicar SQL 16 em produção
- [x] Validar fluxo real em ambiente real: baixa parcial, receber tudo, estorno e reabertura
  Observacao: smoke manual antigo foi substituido por validacao real/manual registrada no plano de fechamento.
- [x] Mudar `receber.defaultValue: false → true` em `src/legacy/bridges/feature-flags.js`
- [x] Observar caminho React como principal apos fechamento dos blocos 1 a 4
- [x] Remover do `index.html`: bloco `#cr-legacy-shell` e todo seu conteúdo
- [x] Deletar `src/features/contas-receber.js`
- [x] Remover import/referência de `contas-receber` de `main.js`
- [x] Adaptar `PedidoDetailPanel` para não depender do fluxo legado

**Status atual:** shell legado removido, flag React ativada por padrão, detalhe de pedido apontando para o fluxo RPC/React e validacao operacional registrada em ambiente real.

### 1B — Remover shell Clientes
> Concluído em 2026-04-21 (commit e5d2063)

- [x] Listagem migrada para React (react-first → react-only)
- [x] Todos os fallbacks e bridges do legado removidos do JS
- [x] Remover do `index.html`: bloco `#cli-legacy-shell`
- [x] Deletar `src/features/clientes.js` (stub de 3.7 KB)
- [x] Remover imports de clientes de `main.js`

### 1C — Remover shell Dashboard
> Concluído em 2026-04-21 (commit e5d2063)

- [x] Dashboard React ativado por padrão (defaultValue: true)
- [x] Remover do `index.html`: blocos `#dash-legacy-content` e `#dash-legacy-controls`
- [x] Deletar `src/features/dashboard.js`
- [x] Remover imports de dashboard de `main.js`

**Fase 1 concluída em governanca.** Contas Receber, Clientes, Pedidos e Dashboard usam caminho React/bridge como principal. A infraestrutura de bridge ainda permanece por desenho e so deve ser removida apos a migracao dos modulos de negocio restantes.

---

## Fase 2 — Migrar legado puro (ordem sugerida)

Cada item é uma sprint independente: criar feature React, cobrir com testes React/unitarios, virar caminho principal e so entao remover legado. Smoke E2E nao bloqueia aceite desta rodada.

### 2A — Produtos
**Por que primeiro:** base para Estoque e Cotação (lookups de produto).  
**Escopo React:** listagem com busca, modal de edição, métricas de preço, preview de cálculo.  
**Referência:** `src/features/produtos.js` → `src/react/features/produtos/`

- [x] Criar tipos, store, services e hooks (`useProdutoData`, `useProdutoMutations`, `useProdutoCalculations`)
- [x] Criar componentes (`ProdutoMetrics`, `ProdutoListView`, `ProdutoForm`, `ProdutoDetailPanel`, `ProdutosPilotPage`)
- [x] Criar bridge (`src/react/produtos-bridge.tsx` + `src/features/produtos-react-bridge.js`)
- [x] Registrar pilot flag `produtos` com `defaultValue: false` em `feature-flags.js`
- [x] Adicionar `#prod-react-root` e `#prod-legacy-shell` no `index.html`
- [x] Cobrir cálculos, store e API com testes unitários
- [x] Flipar `defaultValue: false → true` em `feature-flags.js`
- [x] Remover `src/features/produtos.js` e imports de `main.js`
- [x] Remover `#prod-legacy-shell`, `#modal-produto` e `#modal-prod-det` do `index.html`
- [x] Adaptar `main.js`: `limparFormProdTracked` chama `abrirNovoProdutoReact`, stubs para deps removidos

**Fase 2A concluída.** React é o caminho principal para Produtos.

### 2B — Estoque
> Concluído em 2026-04-23 (commits 89c4620 + ae21652 + limpeza)

**Dependência:** Produtos (2A).  
**Escopo React:** saldo por produto, histórico de movimentações, entrada/saída, alertas de ruptura.  
**Referência:** `src/features/estoque.js` → `src/react/features/estoque/`

- [x] Criar tipos, store, services e hooks (`useEstoqueData`, `useEstoqueMutations`, `useEstoqueCalculations`, `useEstoqueFilters`)
- [x] Criar componentes (`EstoqueMetrics`, `EstoquePositionTable`, `EstoqueHistoryTable`, `EstoqueFilters`, `EstoqueMovementModal`, `EstoquePage`, `EstoquePageHeader`)
- [x] Criar shared UI reutilizável (`DataTable`, `Drawer`, `EmptyState`, `FilterBar`, `FormSection`, `Modal`, `PageHeader`, `StatCard`, `StatusBadge`)
- [x] Registrar rota `/app/estoque` no `AppRouter.tsx` e `wave1Navigation.ts`
- [x] Cobrir cálculos de saldo com `calculateEstoqueSaldos` / `buildEstoquePositionRows`
- [x] Remover `#pg-estoque` e `#modal-mov` do `index.html`
- [x] Deletar `src/features/estoque.js` e remover imports de `main.js`
- [x] Stub das funções legadas em `main.js`; branch de exportCSV e exportarTudo atualizados

**Fase 2B concluída.** React é o caminho principal para Estoque.

### 2C — Cotação
> Concluído em 2026-04-23 (commits 1fd473f + limpeza)

**Dependência:** Produtos (2A).  
**Escopo React:** seleção de fornecedores, tabela de cotação, atualização de preços, lock de cotação, importação de planilhas.  
**Referência:** `src/features/cotacao.js` + `src/features/cotacao/` → `src/react/features/cotacao/`

- [x] Criar tipos, store, services e hooks (`useCotacaoData`, `useCotacaoMutations`, `useCotacaoImport`)
- [x] Criar componentes (`CotacaoPage`, `CotacaoMetrics`, `FornecedorList`, `FornecedorForm`, `CotacaoTable`, `CotacaoImport`, `CotacaoLogs`, `ImportMapModal`)
- [x] Registrar rota `/app/cotacao` no `AppRouter.tsx`, `wave1Navigation.ts` e `navigation/config.ts`
- [x] Importação de .xlsx/.xls/.csv com detecção automática de colunas e barra de progresso
- [x] Remover `#pg-cotacao`, `#modal-forn` e `#modal-mapa` do `index.html`
- [x] Deletar `src/features/cotacao.js` + `src/features/cotacao/` e substituir por stubs no `main.js`

**Fase 2C concluída.** React é o caminho principal para Cotação.

### 2D — RCAs e Oportunidades
> Concluído em 2026-04-23 (RCAs React ativo; oportunidades-jogos.js aguarda 2E)

**Baixa complexidade — bom para fazer junto.**  
**Escopo React:** listagem de RCAs, modal de ação, dados de oportunidades/jogos.  
**Referência:** `src/features/rcas.js` + `src/features/oportunidades-jogos.js` → `src/react/features/rcas/`

- [x] Criar tipos, store, services e hooks (`useRcasData`, `useRcasMutations`)
- [x] Criar componentes (`RcasPage`, `RcaModal`, `RcasRoutePage`)
- [x] Registrar rota `/app/rcas` no `AppRouter.tsx`, `wave1Navigation.ts`, `navigation/config.ts` e `pageMeta.ts`
- [x] Remover `#modal-rca` do `index.html`
- [x] Deletar `src/features/rcas.js` e substituir por stubs no `main.js`
- [ ] `src/features/oportunidades-jogos.js` — manter até 2E (dependência de `relatorios.js`)

**Fase 2D concluída para RCAs.** React é o caminho principal para gestão de vendedores. `oportunidades-jogos.js` será removido junto com `relatorios.js` na Fase 2E.

### 2E — Relatórios
> Concluído em 2026-04-23

**Escopo React:** listagem de relatórios, modal de validação de oportunidade.  
**Referência:** `src/features/relatorios.js` → `src/react/features/relatorios/`

- [x] Criar tipos, store, services e hooks (`useRelatoriosData`, `useRelatoriosMutations`)
- [x] Portar lógica de `oportunidades-jogos.js` como `utils/oportunidadesJogos.ts`
- [x] Criar componentes (`RelatoriosPage`, `OportunidadesTab`, `PerformanceTab`, `ClientesTab`, `ValidacaoModal`, `RelatoriosRoutePage`)
- [x] Registrar rota `/app/relatorios` no `AppRouter.tsx`, `wave1Navigation.ts`, `navigation/config.ts` e `pageMeta.ts`
- [x] Remover `#pg-relatorios` e `#modal-rel-validacao` do `index.html`
- [x] Deletar `src/features/relatorios.js` e `src/features/oportunidades-jogos.js`
- [x] Substituir imports por stubs no `main.js`

**Fase 2E concluída.** React é o caminho principal para Relatórios, oportunidades por jogos e validações.

### 2F — Campanhas
> Concluído em 2026-04-23

**Alta complexidade — última por depender de WhatsApp queue e envios.**  
**Escopo React:** criação/edição, preview, fila de envio WhatsApp, histórico de envios.  
**Referência:** `src/features/campanhas/` → `src/react/features/campanhas/`

- [x] Criar tipos, store, services e hooks (`useCampanhasData`, `useCampanhasMutations`)
- [x] Criar componentes (`CampanhasPage`, `FilaWhatsAppSection`, `HistoricoEnviosSection`, `CampanhaModal`, `WhatsAppPreviewModal`)
- [x] Registrar rota `/app/campanhas` no `AppRouter.tsx`, `wave1Navigation.ts`, `navigation/config.ts` e `pageMeta.ts`
- [x] Fila WhatsApp com seleção múltipla, envio em lote guiado, marcar enviado/falhou/desfazer
- [x] Popup aberto antes do `await gerarFilaEdge` para contornar bloqueio de popup dos browsers
- [x] Remover `#pg-campanhas`, `#modal-campanha`, `#modal-campanha-det` e `#modal-campanha-wa-preview` do `index.html`
- [x] Deletar `src/features/campanhas.js` + `src/features/campanhas/` e substituir por stubs no `main.js`

**Fase 2F concluída.** React é o caminho principal para Campanhas. `src/features/` não contém mais nenhuma feature de negócio.

---

## Fase 3 — Remover infraestrutura bridge
> Concluído em 2026-04-24 (parcial — bridge build e dist-react bundles permanecem até Fase 4)

### O que foi removido
- [x] Deletar `src/legacy/bridges/` (todo o diretório: `feature-flags.js`, `bridge-contract.js`, `storage-keys.js`)
- [x] Remover todas as chamadas a `isPilotEnabled` / `setPilotEnabled` / `getPilotFlagStorageKey` do código
- [x] Criar `src/features/bridge-utils.js` com apenas `createDirectBridgeFromWindow` e `loadDirectBridgeScript`
- [x] Atualizar os 5 feature bridge files para importar de `bridge-utils.js` e eliminar dependência de pilots flags
- [x] Remover storage listeners de feature flags (pilots são permanentemente ativos)

### Permanece para Fase 4 (quando index.html for aposentado)
- `vite.bridge.config.ts` e os 5 `src/react/*-bridge.tsx` entry files — ainda necessários para build
- `dist-react/*-bridge.js` e `dist-react/bridges.css` — ainda carregados pelo `index.html`
- `<link>` e `<script>` de bridge no `index.html` — 1 script estático (dashboard) + 4 lazy
- Os 5 `src/features/*-react-bridge.js` — ainda montam React no shell legado

---

## Fase 4 — Migrar app shell para React
> Concluído em 2026-04-24

**Escopo:** Login/Setup React, logout no sidebar, `index.html` → SPA React, remoção de toda infraestrutura de bridge.

- [x] Criar `src/react/features/auth/services/authApi.ts` (`signInWithPassword`, `signOut`, `listUserFiliais`)
- [x] Criar `src/react/features/auth/components/LoginPage.tsx` (form email/senha, navega para `/setup`)
- [x] Criar `src/react/features/setup/components/SetupPage.tsx` (lista filiais, navega para `/app/dashboard`)
- [x] Atualizar `AppRouter.tsx` — substituir placeholders pelas páginas reais
- [x] Atualizar `AppSidebar.tsx` — adicionar botão de logout (clearSession + clearFilial + navigate /login)
- [x] Substituir `index.html` (968 linhas de legado) pelo entry React SPA (fonts + runtime-config + `<div id="root">`)
- [x] Atualizar `vite.config.ts` — entry muda de `react.html` para `index.html`
- [x] Deletar `vite.bridge.config.ts`
- [x] Deletar `src/react/*-bridge.tsx` (5 entry files de bridge)
- [x] Deletar `src/features/*-react-bridge.js` + `bridge-utils.js` (6 arquivos)
- [x] Remover scripts `dev:bridge` / `build:bridge` do `package.json`
- [x] Substituir imports de bridge em `main.js` por stubs inline

**Fase 4 concluída.** `index.html` é o SPA React. Toda infraestrutura de bridge foi removida. `main.js` sobrevive como arquivo morto (não carregado).

---

## Critérios de conclusão por fase

| Fase | Critério |
|------|---------|
| 1 | Nenhum shell legado visível no HTML; 3 arquivos JS deletados |
| 2 | `src/features/` contém apenas módulos de suporte (sem features de negócio) |
| 3 | `src/legacy/` deletado; zero imports de feature-flags no codebase |
| 4 | `main.js` carrega apenas config/auth; todo roteamento em React Router |

---

## Ordem executiva recomendada

```
[Agora]       1A — validar fluxo real de receber já virado para React
[Semana 1-2]  1B, 1C — remover shells clientes e dashboard
[Mês 1]       2A — Produtos React
[Mês 1-2]     2B — Estoque | 2C — Cotação (paralelo após Produtos)
[Mês 2]       2D — RCAs/Oportunidades | 2E — Relatórios
[Mês 3]       2F — Campanhas
[Mês 3]       3 — Remover infraestrutura bridge
[Futuro]      4 — App shell React (SPA completo)
```
