# Checklist de Execucao - Fases 3 e 4

## Objetivo

Controlar a implantacao da migracao incremental e da politica de engenharia.

## Status atual

### Fase 3 - Plano de migracao

- [x] Estrategia de migracao definida como Strangler Fig hibrido
- [x] Matriz de priorizacao por modulo definida
- [x] Roadmap de sprints definido
- [x] Plano de rollback por camada definido
- [x] Modulo piloto escolhido oficialmente
- [x] Feature flags por modulo definidas
- [x] Criterios de aceite por sprint formalizados no board
  Observacao em 2026-04-23: para a etapa atual, smoke tests nao bloqueiam aceite. Gates validos: lint, typecheck, testes React/unitarios e revisao documental.

### Fase 4 - Politica de engenharia

- [x] Politica de engenharia documentada
- [x] Template de ADR criado
- [x] Template de PR criado
- [x] Guia de contribuicao inicial criado
- [x] ESLint configurado
- [x] Prettier configurado
- [x] Husky configurado
- [x] lint-staged configurado
- [x] Workflow de CI criado
- [x] Gates de merge definidos
  Gates definidos para esta etapa: `quality`, `react-tests` e coverage do piloto quando aplicavel. `e2e-ui-core` existe no CI, mas nao bloqueia o fechamento sem smoke.
- [x] Coverage threshold proposto
- [x] Checklist de code review publicado

## Proxima onda de execucao

### Prioridade 1

- [x] Criar `.github/PULL_REQUEST_TEMPLATE.md`
- [x] Criar `CONTRIBUTING.md`
- [x] Criar template de ADR
- [x] Criar workflow inicial de CI

### Prioridade 2

- [x] Adicionar ESLint
- [x] Adicionar Prettier
- [x] Adicionar Husky
- [x] Adicionar lint-staged

### Prioridade 3

- [x] Ativar typecheck no CI
- [x] Ativar Playwright no CI
- [x] Definir proposta de policy de branch e revisao
- [x] Criar `CODEOWNERS` inicial
- [x] Definir proposta de coverage por fase

## Registro de execucao

### 2026-04-10

- [x] Politica de engenharia criada
- [x] Checklist executivo criado
- [x] Template de ADR criado
- [x] Template de PR criado
- [x] Guia inicial de contribuicao criado
- [x] ESLint inicial configurado
- [x] Prettier inicial configurado
- [x] Workflow inicial de CI criado
- [x] Bug em `notificacoes.js` corrigido durante a ativacao do lint
- [x] `typecheck` e `typecheck:strict` estabilizados e passando
- [x] `lint` estabilizado e utilizavel como gate real
- [x] `format:check` estabilizado e passando
- [x] Checklist de code review publicado
- [x] Proposta objetiva de branch protection documentada
- [x] `CODEOWNERS` inicial criado
- [x] Proposta de threshold de coverage documentada
- [x] `clientes` oficializado como modulo piloto
- [x] Coverage do modulo piloto preparado no CI
- [x] Migracao do piloto iniciada com regra de identidade extraida para TypeScript testavel
- [x] Stores e hook React do piloto `clientes` cobertos por testes
- [x] Adapter React de leitura/escrita de `clientes` extraido e testado
- [x] Primeira UI real de escrita do piloto `clientes` plugada e testada
- [x] Remocao real e resumo contextual do cliente adicionados ao piloto React
- [x] Abas leves e notas/historico iniciados no detalhe do piloto `clientes`
- [x] Coverage React estabilizado acima do threshold apos a camada de notas
- [x] Fidelidade iniciada no detalhe React com saldo, historico e lancamento manual
- [x] Notas/historico aproximados do layout legado no detalhe React
- [x] Primeira ponte preparada entre `pg-clientes` legado e shell React
- [x] Bridge React real registrada para montar o piloto no `cli-react-root`
- [ ] Falta aplicar branch protection no GitHub
  Observacao em 2026-04-23: policy de branch protection esta definida, mas a aplicacao remota nao foi confirmada neste ambiente.

### 2026-04-11

- [x] Incidente de `typecheck:strict` no adapter React de `clientes` identificado e resolvido
- [x] Incidente de `pilot-clientes-coverage` no CI identificado e resolvido com ajuste de escopo e thresholds por fase
- [x] Falhas intermediarias de `format:check` no shell React e componentes do piloto corrigidas antes da estabilizacao final
- [x] Shell legado passou a espelhar acoes reais do piloto React de `clientes`
- [x] Renderizacao do legado foi reduzida adicionalmente quando `Clientes React` esta ativo

### 2026-04-17

- [x] Sidebar sempre escuro com icones SVG estilo Fluig ativada (opt-out nao necessario)
- [x] Pedidos: exibicao do financeiro no painel de detalhe
- [x] Contas-receber: estorno unitario de baixa implementado
- [x] Contas-receber: historico de baixas expandido com mais dados
- [x] Dashboard React pilot ativado por padrao (defaultValue: true), operador pode desativar via flag
- [x] Inicio da remocao progressiva do legado de `clientes`: shell isolado, modal retirado do fluxo React, formulario extraido, detalhe extraido, tabs extraidas, fallbacks separados por camada

### 2026-04-18

- [x] Listagem principal de `clientes` migrada para React (react-first)
- [x] Fallback padrao da listagem de `clientes` desligado
- [x] Todos os fallbacks legados residuais de `clientes` removidos
- [x] Modulo `clientes` declarado react-only: legado e codigo morto

### 2026-04-21

- [x] Contas-receber: baixas migradas para RPCs com consistencia de backend (`rpc_registrar_baixa`, `rpc_estornar_baixa`, `rpc_marcar_conta_pendente`)
- [x] SQL `16_contas_receber_backend_consistencia.sql` preparado e posteriormente aplicado em producao conforme plano de fechamento dos blocos 1 a 4
