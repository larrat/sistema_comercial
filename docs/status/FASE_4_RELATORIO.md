# Relatório Fase 4 — Normalização de pedido.itens

Data: 2026-05-06
Plano: `docs/andamento/PLANO_OPERACIONAL_PADRONIZACAO_PEDIDOS.md`

## O que foi feito

- Criado o SQL idempotente `sql/18_pedido_itens_normalizacao.sql`.
- O SQL cria `public.pedido_itens` com FK para `pedidos` e `produtos`, índices, RLS por filial e backfill a partir de `pedidos.itens`.
- O backfill preserva o item bruto em `item jsonb` e só preenche `produto_id` quando o produto ainda existe na mesma filial, evitando quebra por FK em dados antigos.
- Criadas funções SQL seguras para ignorar JSON inválido e números inválidos durante o backfill.
- A leitura de Pedidos passou a preferir `pedido_itens` quando houver linhas normalizadas.
- Se `pedido_itens` não existir, falhar, ou não tiver itens para um pedido específico, a leitura mantém o fallback para o agregado legado `pedidos.itens`.
- Dashboard e histórico de pedidos no perfil de Cliente passaram pela mesma hidratação com fallback.
- A gravação de pedido continua salvando `pedidos.itens` como agregado legado, com comentário explícito de depreciação até a Fase 5.
- PDV não foi alterado.

## O que não foi feito

- O SQL não foi aplicado em homologação neste turno, porque não há alvo/credencial de banco definida no ambiente local.
- A validação cruzada obrigatória de 50 pedidos não foi executada pelo mesmo motivo.
- Não foi criado dual-write no PDV. Isso é escopo da Fase 5.
- Não foi removido o campo agregado `pedidos.itens`.
- Não foi alterado schema de Receber, Estoque, Clientes, Produtos ou PDV.

## Arquivos alterados

- `sql/18_pedido_itens_normalizacao.sql`
- `src/react/features/pedidos/services/pedidosApi.ts`
- `src/react/features/pedidos/services/pedidosApi.test.ts`
- `src/react/features/clientes/services/pedidosApi.ts`
- `src/react/features/dashboard/services/dashboardApi.ts`
- `docs/status/FASE_4_RELATORIO.md`
- `docs/status/PENDENCIAS.md`

## Validação técnica local

| Comando | Resultado |
|---|---|
| `npx vitest run --config vitest.react.config.ts src/react/features/pedidos/services/pedidosApi.test.ts src/react/features/clientes/services/pedidosApi.test.ts src/react/features/pedidos/store/usePedidoStore.test.ts` | Passou, 3 arquivos e 15 testes. |
| `npm run typecheck` | Passou, 0 erros. |
| `npm run typecheck:strict` | Falhou com os mesmos 11 erros fora de Pedidos já registrados anteriormente. |

## Validação cruzada obrigatória

Não executada ainda. Para concluir a Fase 4 em homologação, aplicar `sql/18_pedido_itens_normalizacao.sql` e validar uma amostra mínima de 50 pedidos cobrindo pedidos antigos, recentes, cancelados e parcelados.

Checklist obrigatório antes de considerar a fase concluída em banco:

- Total do pedido via soma de `pedido_itens.qty * pedido_itens.preco` bate com `pedidos.total` nos casos aplicáveis.
- Total registrado em `pedidos.total` continua igual ao exibido antes da leitura normalizada.
- Contas a Receber mantém os mesmos saldos por cliente.
- Estoque mantém a mesma posição e histórico de movimentações por pedido.
- Pedidos sem linhas em `pedido_itens` continuam exibindo itens pelo fallback de `pedidos.itens`.

## Pontos para o humano verificar

- Confirmar qual ambiente será usado como homologação para aplicar o SQL.
- Aplicar o SQL primeiro em homologação, não em produção.
- Abrir pedidos antigos e novos e conferir se os itens exibidos continuam iguais.
- Conferir Dashboard e perfil de Cliente, porque ambos também leem itens de pedidos.
- Conferir Receber e Estoque depois da validação cruzada.
- Não autorizar Fase 5 enquanto essa validação de banco não estiver 100% batida.

## Pausa obrigatória

A Fase 5 não foi iniciada. A Fase 4 está preparada no código e no SQL, mas depende da aplicação em homologação e da validação cruzada para ser considerada concluída operacionalmente.
