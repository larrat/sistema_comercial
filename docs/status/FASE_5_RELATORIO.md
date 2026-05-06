# Relatório Fase 5 — Integração PDV e estabilização

Data: 2026-05-06
Plano: `docs/andamento/PLANO_OPERACIONAL_PADRONIZACAO_PEDIDOS.md`

## O que foi feito

- O PDV passou a ter dual-write aditivo na camada `savePedido`, sem alterar a tela, o carrinho, o comprovante ou o fluxo de pagamento.
- Vendas com `origem_venda: 'pdv'` continuam gravando o agregado legado `pedidos.itens` como antes.
- Quando a flag `window.__SC_PEDIDO_ITENS_DUAL_WRITE__` está ligada, a mesma venda também grava linhas em `pedido_itens`.
- A flag fica desligada por padrão em produção. Ela pode ser ligada explicitamente via `window.__SC_PEDIDO_ITENS_DUAL_WRITE__ = true` ou por hostname de homologação/staging/preview.
- Se o dual-write em `pedido_itens` falhar, a venda não é bloqueada: o agregado legado fica preservado e a falha é registrada em `console.warn`.
- O status geral foi atualizado para tratar Pedidos como referência junto com Clientes/Produtos, com ressalva de validação de banco.

## O que não foi feito

- Não houve mudança visual no PDV.
- Não houve mudança no comprovante.
- Não houve mudança no cálculo de pagamento, desconto, estoque ou contas a receber.
- Não foi ligada a flag em produção.
- Não foi aplicada migração em homologação ou produção neste turno.
- Não foi executada a validação real com 10+ vendas simuladas em homologação, porque não há alvo/credencial de banco configurado no ambiente local.

## Arquivos alterados

- `src/react/features/pedidos/services/pedidosApi.ts`
- `src/react/features/pedidos/services/pedidosApi.test.ts`
- `src/types/global.d.ts`
- `docs/status/FASE_5_RELATORIO.md`
- `docs/status/PENDENCIAS.md`
- `docs/status/STATUS_GERAL_2026-05-06.md`

## Validação técnica local

| Comando | Resultado |
|---|---|
| `npx vitest run --config vitest.react.config.ts src/react/features/pedidos/services/pedidosApi.test.ts src/react/features/clientes/services/pedidosApi.test.ts src/react/features/pedidos/store/usePedidoStore.test.ts src/react/features/pedidos/pdv/pdvCart.test.ts` | Passou, 4 arquivos e 22 testes. |
| `npm run typecheck` | Passou, 0 erros. |
| `npm run typecheck:strict` | Falhou com os mesmos 11 erros fora de Pedidos já registrados anteriormente. |

## Validação de homologação ainda necessária

Antes de ligar a flag em produção:

- Aplicar `sql/18_pedido_itens_normalizacao.sql` em homologação.
- Ligar `window.__SC_PEDIDO_ITENS_DUAL_WRITE__ = true` em homologação.
- Fechar pelo menos 10 vendas simuladas pelo PDV.
- Confirmar que cada venda aparece em `pedidos.itens` e em `pedido_itens`.
- Conferir que comprovante, Receber e Estoque continuam iguais.
- Confirmar que o operador não percebe nenhuma diferença visual.

## Pontos para o humano verificar

- O PDV abre e fecha venda exatamente como antes.
- O comprovante impresso/visualizado continua igual.
- A venda entra em Pedidos normalmente.
- Receber e Estoque continuam batendo após venda nova.
- Em homologação com flag ligada, `pedido_itens` recebe as linhas da venda.

## Pausa obrigatória

O plano de Fases 0 a 5 foi implementado no repositório, mas a parte de banco das Fases 4 e 5 ainda depende de aplicação e validação em homologação antes de qualquer decisão de produção.
