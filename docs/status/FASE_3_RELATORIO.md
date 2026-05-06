# Relatório Fase 3 — Formulários e modais de Pedidos

Data: 2026-05-06
Plano: `docs/andamento/PLANO_OPERACIONAL_PADRONIZACAO_PEDIDOS.md`

## O que foi feito

- O formulário de criação/edição de pedido passou a abrir dentro de `Drawer`, seguindo o padrão operacional usado em Clientes/Produtos.
- Removidas as classes `modal-shell-head` e `modal-shell-body` do módulo Pedidos.
- Criado `PedidoBaixaModal` com `Modal` compartilhado para substituir o formulário inline de baixa parcial no detalhe antigo.
- Mantido `PedidoCancelConfirmModal` como modal compartilhado de cancelamento.
- Regras locais de formulário, preço e totais foram movidas para `src/react/features/pedidos/utils/pedidoRules.ts`.
- O comportamento funcional foi mantido: salvar, editar, cancelar, avançar status, reabrir, gerar conta e registrar baixa continuam usando os mesmos services/RPCs atuais.

## O que não foi feito

- Não foi alterada nenhuma regra de negócio de pedido.
- Não foi alterado SQL.
- Não foi alterado PDV.
- Não foi normalizado `pedido.itens`.
- Não foi removido `PedidoRow.tsx`, porque a remoção de código legado interno precisa validação específica.
- Não foi iniciada a Fase 4.

## Modais migrados

| Fluxo | Antes | Depois |
|---|---|---|
| Cancelar pedido | `PedidoCancelConfirmModal` já usava `Modal` compartilhado | Mantido sem mudança estrutural. |
| Baixa parcial no detalhe antigo | Formulário inline dentro de `PedidoDetailPanel.tsx` | `PedidoBaixaModal.tsx` usando `Modal` compartilhado. |
| Formulário de pedido | Render inline abaixo da lista | Render dentro de `Drawer` compartilhado em `PedidosPilotPage.tsx`. |

## Regras movidas

| Regra | Origem | Destino |
|---|---|---|
| Data padrão do pedido | `PedidoForm.tsx` | `utils/pedidoRules.ts` (`getTodayISODate`) |
| Próximo número do pedido | `PedidoForm.tsx` | `utils/pedidoRules.ts` (`getNextPedidoNumber`) |
| Formatação monetária de itens/form | `PedidoForm.tsx`, `PedidoItemsSection.tsx`, `PedidoItemRow.tsx` | `utils/pedidoRules.ts` (`formatPedidoCurrency`) |
| Normalização de prazo | `PedidoForm.tsx` | `utils/pedidoRules.ts` (`normalizePedidoPrazo`) |
| Parse de `pedido.itens` no form | `PedidoForm.tsx` | `utils/pedidoRules.ts` (`parsePedidoItens`) |
| Total do pedido | `PedidoForm.tsx`, `PedidoItemsSection.tsx` | `utils/pedidoRules.ts` (`calculatePedidoTotal`) |
| Lucro total do pedido | `PedidoItemsSection.tsx` | `utils/pedidoRules.ts` (`calculatePedidoLucroTotal`) |
| Subtotal/lucro/margem do item | `PedidoItemRow.tsx` | `utils/pedidoRules.ts` (`calculatePedidoItemSubtotal`, `calculatePedidoItemLucro`, `calculatePedidoItemMargem`) |
| Preço sugerido de item | `PedidoItemAdd.tsx` | `utils/pedidoRules.ts` (`calcPrecoSugerido`) |
| Validação de cliente/itens | `PedidoForm.tsx` | `utils/pedidoRules.ts` (`validatePedidoForm`) |
| Resolução do nome do RCA | `PedidoForm.tsx` | `utils/pedidoRules.ts` (`resolveRcaNome`) |

## Arquivos alterados

- `src/react/features/pedidos/components/PedidosPilotPage.tsx`
- `src/react/features/pedidos/components/PedidoForm.tsx`
- `src/react/features/pedidos/components/PedidoDetailPanel.tsx`
- `src/react/features/pedidos/components/PedidoBaixaModal.tsx`
- `src/react/features/pedidos/components/PedidoItemAdd.tsx`
- `src/react/features/pedidos/components/PedidoItemsSection.tsx`
- `src/react/features/pedidos/components/PedidoItemRow.tsx`
- `src/react/features/pedidos/utils/pedidoRules.ts`
- `docs/status/FASE_3_RELATORIO.md`
- `docs/status/PENDENCIAS.md`

## Pendências geradas

Nenhuma pendência nova de produto foi gerada nesta fase.

Continuam válidas as pendências anteriores sobre `PedidoRow.tsx`, tabs locais, PDV, histórico completo e dados específicos de entrega/logística.

## Validação técnica

| Comando | Resultado |
|---|---|
| `rg -n "modal-shell|window.confirm|confirm\\(" src/react/features/pedidos --glob '*.tsx' --glob '*.ts'` | 0 ocorrências. |
| `npm run typecheck` | Passou, 0 erros. |
| `npm run typecheck:strict` | Falhou com os mesmos 11 erros fora de Pedidos já registrados na Fase 0. |
| `npx vitest run --config vitest.react.config.ts src/react/features/pedidos/services/pedidosApi.test.ts src/react/features/pedidos/store/usePedidoStore.test.ts` | Passou, 2 arquivos e 7 testes. |

## Pontos para o humano verificar

- Criar um pedido novo pelo botão da lista e confirmar que o formulário abre em drawer.
- Editar um pedido existente e confirmar que os campos, itens e total continuam iguais.
- Cancelar um pedido e confirmar que o modal segue claro.
- Abrir o detalhe antigo em drawer e registrar uma baixa parcial usando o novo modal.
- Conferir se Receber continua refletindo as baixas corretamente.
- Confirmar que PDV não mudou visualmente nem funcionalmente.

## Pausa obrigatória

A Fase 4 não foi iniciada. A próxima fase só deve começar com aprovação explícita.
