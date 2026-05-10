# Relatório — Navegação e edição de itens de Pedidos

Última atualização: 2026-05-10

## O que foi feito

- Clique em linha da lista de Pedidos agora navega direto para `/app/pedidos/:pedidoId`.
- Drawer lateral de detalhe foi removido da lista de Pedidos.
- Página `/app/pedidos/:pedidoId` ficou com 4 abas: Itens, Financeiro, Histórico e Cadastro.
- Aba Itens ganhou edição inline de quantidade e preço para admin em status editável.
- Remoção de item usa `Modal` compartilhado e não aparece quando o pedido tem apenas 1 item.
- Adição de item usa o componente existente `PedidoItemAdd`, dentro de `Modal` compartilhado.
- Permissão visual usa RBAC já existente no frontend (`useRoleStore`), sem criar lógica paralela de papel.
- Regras definitivas de permissão, status, validação e recálculo ficam nas novas RPCs SQL.

## RPCs criadas

| RPC | Situação | Observação |
|---|---|---|
| `pedido_item_atualizar` | Criada em `sql/20_pedido_itens_edicao.sql` | Atualiza quantidade/preço e recalcula total no banco. |
| `pedido_item_remover` | Criada em `sql/20_pedido_itens_edicao.sql` | Impede remover o último item. |
| `pedido_item_adicionar` | Criada em `sql/20_pedido_itens_edicao.sql` | Adiciona produto existente da filial e recalcula total. |

## Arquivos alterados

- `sql/20_pedido_itens_edicao.sql`
- `src/types/domain.d.ts`
- `src/react/features/pedidos/services/pedidosApi.ts`
- `src/react/features/pedidos/services/pedidosApi.test.ts`
- `src/react/features/pedidos/hooks/usePedidoMutations.ts`
- `src/react/features/pedidos/components/PedidosPilotPage.tsx`
- `src/react/features/pedidos/components/PedidoProfilePage.tsx`
- `src/react/features/pedidos/components/PedidoItensTab.tsx`
- `src/react/styles.css`
- `docs/status/PENDENCIAS.md`
- `docs/status/RELATORIO_NAVEGACAO_EDICAO_PEDIDOS.md`

## Impactos indiretos verificados

| Área | Resultado |
|---|---|
| Estoque | Não foi encontrada RPC existente de edição de item de pedido que gere movimentação de estoque. A nova RPC não altera estoque automaticamente. Registrado em pendências. |
| Receber | A edição de itens não atualiza contas a receber vinculadas, conforme especificação. Registrado em pendências para decisão humana. |
| Relatórios | `PerformanceTab` ainda usa `status === 'entregue'`; precisa revisão futura para status normalizados. |
| Dashboard | Ainda há métricas que contam `status === 'entregue'`; precisa revisão futura para status normalizados. |

## Validação local

| Validação | Resultado |
|---|---|
| `npm run typecheck:strict` | Passou. |
| `npm run typecheck` | Passou. |
| `npx vitest run --config vitest.react.config.ts src/react/features/pedidos/services/pedidosApi.test.ts src/react/features/pedidos/store/usePedidoStore.test.ts` | Passou: 2 arquivos, 16 testes. |
| `npm run build:react` | Passou, com aviso já conhecido de chunk acima de 500 kB. |
| Homologação com SQL aplicado | Não executada localmente; depende de alvo/credencial de homologação. |
| Cenários manuais da especificação | Pendentes de validação humana após aplicar SQL em homologação. |

## Pontos para o humano verificar

- Clicar em pedido na lista abre direto `/app/pedidos/:pedidoId`.
- Admin vê controles de edição apenas em status permitido.
- Não-admin não vê controles de edição.
- Pedido concluído/cancelado não mostra controles.
- Alterar quantidade/preço atualiza a tela após retorno do servidor.
- Remover item com 2+ itens abre confirmação e recalcula total.
- Pedido com 1 item não mostra ação de remover item.
- Adicionar item abre modal, seleciona produto existente e recalcula total.
- Financeiro e Estoque permanecem sem alteração automática após edição de itens.
