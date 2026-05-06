# Relatório Fase 1 — Lista de Pedidos

Data: 2026-05-06
Plano: `docs/andamento/PLANO_OPERACIONAL_PADRONIZACAO_PEDIDOS.md`

## O que foi feito

- A lista `/app/pedidos` manteve `PageHeader`, `FilterBar`, `DataTable` e `ActionMenu` compartilhados.
- As métricas locais `ped-stats-bar`/`ped-stat` foram substituídas por `StatCard`, no mesmo padrão visual usado em Produtos e outros módulos.
- A `FilterBar` passou a usar `activeFilterCount` e `onClearFilters` nativos do componente compartilhado.
- A ordenação permaneceu como controle explícito, sem mudar contrato de query nem comportamento funcional.
- Foi adicionado CSS específico para organizar os filtros de Pedidos sem alterar o `FilterBar` global.

## O que não foi feito

- Não foi criada rota `/app/pedidos/:pedidoId`.
- Não foi alterado o drawer/detalhe antigo de pedido.
- Não foi alterado o formulário de criação/edição.
- Não foi alterado nenhum modal de detalhe/formulário.
- Não foi alterado PDV.
- Não foi alterado SQL.
- Não foi iniciada a Fase 2.

## Arquivos alterados

- `src/react/features/pedidos/components/PedidoListView.tsx`
- `src/react/styles.css`
- `docs/status/FASE_1_RELATORIO.md`
- `docs/status/PENDENCIAS.md`

## Pendências geradas

Nenhuma pendência nova foi gerada nesta fase.

Continuam válidas as pendências da Fase 0 sobre:

- `PedidoRow.tsx` possivelmente legado.
- Tabs de Pedidos ainda locais.
- Separação Pedidos/PDV apenas quando o plano permitir.
- Extração futura de regras de negócio para hooks/services.
- Impacto futuro da normalização de `pedido.itens`.

## Validação técnica

| Comando | Resultado |
|---|---|
| `npm run typecheck` | Passou, 0 erros. |
| `npm run typecheck:strict` | Falhou com os mesmos 11 erros fora de Pedidos já registrados na Fase 0. |
| `npx vitest run --config vitest.react.config.ts src/react/features/pedidos/services/pedidosApi.test.ts src/react/features/pedidos/store/usePedidoStore.test.ts` | Passou, 2 arquivos e 7 testes. |

## Pontos para o humano verificar

- A lista de Pedidos parece mais próxima de Produtos/Clientes?
- As métricas em cards ficaram claras para o uso diário?
- Os filtros continuam funcionando como antes?
- O clique na linha ainda abre o detalhe antigo em drawer?
- Clientes, Produtos, Estoque, Receber e PDV continuam visualmente e funcionalmente intactos?

## Pausa obrigatória

A Fase 2 não foi iniciada. A próxima fase só deve começar com aprovação explícita.
