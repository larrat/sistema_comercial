# Relatório — Separação de entrega e pagamento

Data: 2026-05-10
Especificação: separação entre confirmação de entrega e baixa de pagamento.

## O que foi feito

- Criada a migration `sql/19_entrega_pagamento_pedidos.sql`.
- A migration adiciona `pedidos.entregue_em` e `pedidos.entregue_por`.
- A migration adiciona os novos status de pedido sem remover status antigos.
- Criada a RPC `pedido_marcar_entregue`, responsável por confirmar entrega e decidir o novo status no banco.
- Criada a RPC `receber_apos_baixa_verificar_pedido`, chamada após baixa em Receber para concluir o pedido quando o saldo chegar a zero.
- Atualizada a função `sync_conta_receber_from_baixas` para chamar a verificação de pedido depois do refresh financeiro existente.
- A lista de Pedidos agora exibe os novos badges e abre modal compartilhado antes de confirmar entrega.
- A página `/app/pedidos/:pedidoId` também usa modal de confirmação de entrega.
- A aba Histórico passou a mostrar dados de entrega (`entregue_em`, `entregue_por`) e continua mostrando baixas financeiras.
- Status antigos continuam legíveis no frontend:
  - `entregue` aparece como `entregue_aguardando_pagamento`.
  - `pago` aparece como `pago_aguardando_entrega`.

## O que não foi feito

- A migration não foi aplicada em homologação neste turno.
- Não houve validação cruzada real com os 20 pedidos exigidos, porque não há alvo/credencial de homologação configurado no ambiente local.
- Não houve alteração no PDV.
- Não houve alteração visual ou funcional na tela de Contas a Receber.
- Não foram alterados Dashboard, Relatórios, Campanhas ou Estoque; impactos foram apenas verificados e registrados abaixo.
- Não houve migração de pedidos antigos para os novos status.
- Não foi criada distinção nova entre "à vista pago no pedido" e "à vista pago na entrega", porque o schema atual não tem campo explícito para essa diferença e a especificação proibiu inventar campo sem verificar o schema.
- Não foi implementada geração automática nova de Contas a Receber na criação do pedido; o trabalho ficou concentrado no evento de entrega e na verificação pós-baixa, preservando o fluxo financeiro existente.

## Arquivos alterados

- `sql/19_entrega_pagamento_pedidos.sql`
- `src/types/domain.d.ts`
- `src/react/features/pedidos/types.ts`
- `src/react/features/pedidos/services/pedidosApi.ts`
- `src/react/features/pedidos/services/pedidosApi.test.ts`
- `src/react/features/pedidos/hooks/usePedidoMutations.ts`
- `src/react/features/pedidos/components/PedidoEntregaConfirmModal.tsx`
- `src/react/features/pedidos/components/PedidoListView.tsx`
- `src/react/features/pedidos/components/PedidoProfilePage.tsx`
- `src/react/features/pedidos/components/PedidoDetailPanel.tsx`
- `src/react/features/pedidos/components/PedidoRow.tsx`
- `src/react/features/pedidos/components/PedidoForm.tsx`
- `src/react/features/pedidos/store/usePedidoStore.test.ts`
- `docs/status/RELATORIO_ENTREGA_PAGAMENTO.md`
- `docs/status/PENDENCIAS.md`

## Validação técnica local

| Comando | Resultado |
|---|---|
| `npm run typecheck:strict` | Passou. |
| `npx vitest run --config vitest.react.config.ts src/react/features/pedidos/services/pedidosApi.test.ts src/react/features/pedidos/store/usePedidoStore.test.ts src/react/features/clientes/services/pedidosApi.test.ts src/react/features/pedidos/pdv/pdvCart.test.ts` | Passou, 4 arquivos e 23 testes. |

## Validação cruzada de homologação

Não executada ainda. A tabela abaixo deve ser preenchida depois de aplicar a migration em homologação.

| Cenário | Resultado |
|---|---|
| À vista, pago no pedido | Pendente de homologação. |
| À vista, pago na entrega | Pendente de homologação. |
| Prazo | Pendente de homologação. |
| Misto | Pendente de homologação. |
| Baixa em Receber sem entrega | Pendente de homologação. |
| Pedido antigo com status `entregue` | Validado localmente no mapeamento de frontend; pendente em dados reais. |
| Pedido cancelado | Pendente de homologação. |

## Impactos indiretos encontrados

| Área | Resultado da verificação |
|---|---|
| Relatórios | `PerformanceTab` conta diretamente `status === 'entregue'`. Deve ser revisado antes de usar novos status como base de faturamento. Não alterado nesta execução. |
| Dashboard | `DashboardPilotPage` calcula faturamento, lucro, entregues hoje e conversão usando `status === 'entregue'`. Deve ser revisado em uma execução própria. Não alterado nesta execução. |
| Campanhas | Não foi encontrado uso direto de status de pedido para elegibilidade. Sem alteração. |
| Estoque | A posição/histórico de estoque não depende do status de entrega na leitura React verificada. Sem alteração. |
| PDV | Continua gravando `status: 'entregue'` e não foi alterado por regra da especificação. O mapeamento de frontend mantém esse status legível como entregue aguardando pagamento. |

## Pendências geradas

- Aplicar `sql/19_entrega_pagamento_pedidos.sql` em homologação.
- Executar a validação cruzada mínima de 20 pedidos.
- Revisar Dashboard e Relatórios para novos status antes de considerar métricas de entrega/faturamento como definitivas.
- Decidir se o PDV continuará gravando `entregue` legado ou se terá uma execução futura própria para usar os novos eventos.
- Definir, em uma próxima especificação, como diferenciar no cadastro do pedido "pago no pedido" versus "pago na entrega".

## Pausa

Nada foi aplicado em produção. A próxima etapa é homologação com aprovação humana explícita.
