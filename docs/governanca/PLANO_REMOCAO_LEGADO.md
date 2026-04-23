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
- [ ] Validar pilot no browser (`localStorage.setItem('sc_produtos_react_enabled','true')`)
- [ ] Flipar `defaultValue: false → true` em `feature-flags.js`
- [ ] Remover `src/features/produtos.js` e imports de `main.js`
- [ ] Remover `#prod-legacy-shell` do `index.html`

### 2B — Estoque
**Dependência:** Produtos (2A).  
**Escopo React:** saldo por produto, histórico de movimentações, entrada/saída, alertas de ruptura.  
**Referência:** `src/features/estoque.js` → `src/react/features/estoque/`

### 2C — Cotação
**Dependência:** Produtos (2A).  
**Escopo React:** seleção de fornecedores, tabela de cotação, atualização de preços, lock de cotação.  
**Referência:** `src/features/cotacao.js` + `src/features/cotacao/` → `src/react/features/cotacao/`

### 2D — RCAs e Oportunidades
**Baixa complexidade — bom para fazer junto.**  
**Escopo React:** listagem de RCAs, modal de ação, dados de oportunidades/jogos.  
**Referência:** `src/features/rcas.js` + `src/features/oportunidades-jogos.js` → `src/react/features/rcas/`

### 2E — Relatórios
**Escopo React:** listagem de relatórios, modal de validação de oportunidade.  
**Referência:** `src/features/relatorios.js` → `src/react/features/relatorios/`

### 2F — Campanhas
**Alta complexidade — última por depender de WhatsApp queue e envios.**  
**Escopo React:** criação/edição, preview, fila de envio WhatsApp, histórico de envios.  
**Referência:** `src/features/campanhas/` → `src/react/features/campanhas/`

---

## Fase 3 — Remover infraestrutura bridge
> Executar somente após Fase 2 completa.

1. Remover `src/legacy/bridges/` (o diretório inteiro)
2. Remover os 4 `<script>` de bridge do `index.html`
3. Remover chamadas a `isPilotEnabled` / `setPilotEnabled` de todo o código
4. Deletar entradas de build de bridge em `vite.config.ts` (ou equivalente)
5. Deletar bundles gerados em `dist-react/*-bridge.js`

---

## Fase 4 — Migrar app shell para React (opcional, longo prazo)
> Módulos de suporte que ainda estão em vanilla JS mas não são "features":

| Módulo | Arquivo | Caminho React sugerido |
|--------|---------|------------------------|
| Navegação/Sidebar | `src/features/navigation.js` | `src/react/app/Navigation/` |
| Auth e roles | `src/features/auth-setup.js` | `src/react/app/Auth/` |
| Filiais/Acessos | `src/features/filiais-acessos.js` | `src/react/app/Filiais/` |
| Notificações | `src/features/notificacoes.js` | `src/react/app/Notificacoes/` |
| Telemetria | `src/features/telemetria.js` | manter como módulo puro (sem UI) |

**Nota:** Esta fase converte o `index.html` em um SPA verdadeiro, com roteamento React. É uma refatoração estrutural grande — tratar como projeto separado.

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
