# Plano de Remoção do Sistema Legado

**Data:** 2026-04-21  
**Objetivo:** Eliminar todo código vanilla JS de features, shells HTML legados e infraestrutura de bridge, deixando apenas React + módulos de app (auth, nav, config).

---

## Estado atual (diagnóstico)

### Totalmente migrados para React
| Módulo | Status |
|--------|--------|
| Pedidos | React-only, legado é stub vazio |
| Contas Receber | React-only (commits `42d7b15` e `5976676`) |

### Híbridos (React pronto, shell legado ainda presente)
| Módulo | Flag | Default | Shell legado | Situação JS |
|--------|------|---------|--------------|-------------|
| Clientes | `sc_clientes_react_enabled` | true | `#cli-legacy-shell` (HTML) | JS react-only desde 2026-04-18; stub `clientes.js` pode ser deletado |
| Dashboard | `sc_dashboard_react_enabled` | true | `#dash-legacy-content` (HTML) | `dashboard.js` (57 KB) ainda presente |

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
- 4 script tags de bridge no `index.html`

---

## Fase 1 — Fechar os híbridos
> Pré-requisito: SQL/RPCs de contas-receber validados em produção.  
> Ganho imediato: remove ~3 módulos JS + 3 shells HTML sem escrever feature nova.

### 1A — Flipar e remover Contas Receber
- [x] Revisar SQL `16_contas_receber_backend_consistencia.sql`
- [x] Confirmar decisão de negócio sobre `status vencido`
- [x] Implementar RPCs no código (`rpc_registrar_baixa`, `rpc_estornar_baixa`, `rpc_marcar_conta_pendente`)
- [x] Aplicar SQL 16 em produção
- [ ] Rodar smoke test manual: pendentes → baixa parcial → desfazer → estornar → receber tudo
- [x] Mudar `receber.defaultValue: false → true` em `src/legacy/bridges/feature-flags.js`
- [ ] Observar 1–2 dias em produção com flag ativa
- [x] Remover do `index.html`: bloco `#cr-legacy-shell` e todo seu conteúdo
- [x] Deletar `src/features/contas-receber.js`
- [x] Remover import/referência de `contas-receber` de `main.js`
- [x] Adaptar `PedidoDetailPanel` para não depender do fluxo legado

**Status atual:** shell legado removido, flag React ativada por padrão e detalhe de pedido já apontando para o fluxo RPC/React. Resta apenas a validação operacional em ambiente real.

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

**Fase 1 concluída em 2026-04-21.** Contas Receber, Clientes e Dashboard são React-only. Nenhum shell legado restante no HTML.

---

## Fase 2 — Migrar legado puro (ordem sugerida)

Cada item é uma sprint independente: criar feature React → validar pilot → remover legado.

### 2A — Produtos
**Por que primeiro:** base para Estoque e Cotação (lookups de produto).  
**Escopo React:** listagem com busca, modal de edição, métricas de preço, preview de cálculo.  
**Referência:** `src/features/produtos.js` → `src/react/features/produtos/`

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
