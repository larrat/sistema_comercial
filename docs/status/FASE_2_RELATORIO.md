# Relatório Fase 2 — Detalhe de Pedido em página própria

Data: 2026-05-06
Plano: `docs/andamento/PLANO_OPERACIONAL_PADRONIZACAO_PEDIDOS.md`

## O que foi feito

- Criada a rota `/app/pedidos/:pedidoId`.
- Criada a página própria de detalhe do pedido no padrão visual de Clientes/Produtos.
- Criadas abas: Itens, Pagamento, Entrega/Logística, Histórico e Cadastro.
- Adicionado carregamento de pedido por ID quando ele não está na página atual da store.
- Adicionada leitura financeira vinculada ao pedido usando as fontes existentes de Contas a Receber.
- O drawer antigo da lista ganhou ação "Abrir página completa".
- Links existentes de detalhe de pedido via `buildPedidosRoute({ pedidoId, view: 'detail' })` agora apontam para `/app/pedidos/:pedidoId`.
- Ações existentes foram preservadas: avançar status, cancelar, reabrir, editar pelo fluxo antigo e gerar conta quando aplicável.

## O que não foi feito

- Não foi reescrito o formulário de pedido.
- Não foram trocados os modais antigos.
- Não foi alterado SQL.
- Não foi alterado PDV.
- Não foi normalizado `pedido.itens`.
- Não foi iniciada a Fase 3.

## Arquivos alterados

- `src/react/app/router/AppRouter.tsx`
- `src/react/app/router/wave1Navigation.ts`
- `src/react/features/pedidos/components/PedidosPilotPage.tsx`
- `src/react/features/pedidos/components/PedidoProfilePage.tsx`
- `src/react/features/pedidos/hooks/usePedidoProfile.ts`
- `src/react/features/pedidos/pages/PedidoProfileRoutePage.tsx`
- `src/react/features/pedidos/services/pedidosApi.ts`
- `docs/status/FASE_2_RELATORIO.md`
- `docs/status/PENDENCIAS.md`

## Pendências geradas

- A aba Entrega/Logística exibe apenas dados existentes hoje: status, origem, tipo, data e observação. Campos específicos de entrega aparecem como ausência de dado, não como mock.
- A aba Histórico usa metadados disponíveis (`venda_fechada`, `venda_fechada_em`, `venda_fechada_por`) e baixas financeiras; não existe trilha completa de eventos do pedido no schema atual.
- O botão Editar continua abrindo o fluxo antigo em `/app/pedidos?pedido=<id>&view=edit`, conforme escopo da Fase 2.

## Validação técnica

| Comando | Resultado |
|---|---|
| `npm run typecheck` | Passou, 0 erros. |
| `npm run typecheck:strict` | Falhou com os mesmos 11 erros fora de Pedidos já registrados na Fase 0. |
| `npx vitest run --config vitest.react.config.ts src/react/features/pedidos/services/pedidosApi.test.ts src/react/features/pedidos/store/usePedidoStore.test.ts` | Passou, 2 arquivos e 7 testes. |

## Pontos para o humano verificar

- Abrir `/app/pedidos/:pedidoId` para pedidos diferentes e conferir se os dados batem com o drawer antigo.
- Conferir se o drawer antigo ainda abre pela lista e se o botão "Abrir página completa" funciona.
- Conferir se links de pedido dentro do perfil de Cliente abrem a página própria.
- Conferir se cancelar, avançar, reabrir e editar continuam funcionando.
- Confirmar se as informações ausentes em Entrega/Logística e Histórico são aceitáveis como `—` até existir dado real.

## Pausa obrigatória

A Fase 3 não foi iniciada. A próxima fase só deve começar com aprovação explícita.
