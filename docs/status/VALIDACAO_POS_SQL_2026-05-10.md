# Validação Pós-SQL — 2026-05-10

Este documento registra o próximo passo depois de o operador humano informar que os SQLs pendentes foram executados no banco.

## SQLs informados como executados pelo operador

- `sql/18_pedido_itens_normalizacao.sql`
- `sql/19_entrega_pagamento_pedidos.sql`
- `sql/20_pedido_itens_edicao.sql`
- `sql/21_pedidos_numero_atomico.sql`
- `sql/manual/2026-05-10_corrigir_pedidos_venda_fechada_bruno.sql`

Observação: esta sessão não acessou o banco de homologação/produção diretamente. A confirmação acima vem da informação do operador humano.

## Validação local executada

| Validação | Resultado |
|---|---|
| `npm run typecheck:strict` | Passou. |
| `npm run typecheck` | Passou. |
| `npx vitest run --config vitest.react.config.ts src/react/features/pedidos/services/pedidosApi.test.ts src/react/features/pedidos/store/usePedidoStore.test.ts src/react/features/pedidos/pdv/pdvCart.test.ts src/react/features/produtos/services/produtosApi.test.ts` | Passou: 4 arquivos, 45 testes. |
| `npm run build:react` | Passou, com aviso conhecido de chunk acima de 500 kB. |

## Validação funcional agora necessária

### Pedidos e Receber

- Conferir se os pedidos sem `venda_fechada` ganharam contas em Receber.
- Conferir se pedidos entregues ficaram com `venda_fechada = true`.
- Conferir se o pedido do Bruno ficou no cenário correto decidido pelo humano.
- Conferir se o pedido do Marcio não está mais duplicando `num = 7`.
- Conferir se baixas retroativas foram feitas apenas uma a uma, quando confirmadas.

### Numeração nova

- Criar um pedido novo pela tela de Pedidos.
- Criar uma venda nova pelo PDV.
- Confirmar que os números não duplicam.
- Confirmar que a RPC `next_pedido_num` está retornando o próximo número por filial.

### Edição de itens

- Abrir um pedido editável como admin.
- Alterar quantidade e preço inline.
- Remover item em pedido com 2+ itens.
- Adicionar item.
- Confirmar que total recalcula pelo servidor.
- Confirmar que não-admin não vê controles.

### Entrega e pagamento

- Marcar pedido como entregue.
- Conferir novo status.
- Conferir Receber vinculado.
- Baixar conta e confirmar se pedido conclui quando saldo chega a zero.

### Produtos / Variantes

- Abrir `/app/produtos/:produtoId?tab=variantes`.
- Alternar 30 dias, 90 dias e 12 meses.
- Conferir cards, tabela, linha de total do produto pai e gráficos.
- Confirmar se vendas/receita aparecem com dados de `pedido_itens`.

## Próxima decisão

Se a validação funcional acima passar, o próximo passo recomendado é commitar as mudanças de código, SQL e documentação.
