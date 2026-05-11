# Relatório — Correção de reatividade da lista de pedidos

Data: 2026-05-11
Escopo: atualização local da lista após ações de pedido.

## Padrão encontrado

Padrão B — estado local com store Zustand.

O módulo de Pedidos não usa React Query nem Supabase Realtime para a lista. A tela carrega a página via `usePedidoData` e mantém os pedidos em `usePedidoStore`.

## Problema encontrado

Após a RPC de confirmação de entrega, `confirmarEntrega` já chamava `upsertPedido` com o pedido atualizado.

O problema estava no comportamento do `upsertPedido`: quando o pedido mudava para um status fora da aba atual, ele apenas substituía a linha no array local. Assim, um pedido que virava `concluido` podia continuar visível na aba "Em Aberto" até novo fetch/F5.

## O que foi alterado

- `src/react/features/pedidos/store/usePedidoStore.ts`
  - Adicionada verificação `pedidoMatchesCurrentView`.
  - `upsertPedido` agora:
    - substitui o pedido se ele ainda pertence à aba/filtros atuais;
    - remove o pedido da página atual se ele não pertence mais à aba/filtros atuais;
    - mantém o resumo atualizado como antes;
    - ajusta o total filtrado da página quando a linha sai da lista.

- `src/react/features/pedidos/store/usePedidoStore.test.ts`
  - Adicionado teste cobrindo pedido em "Em Aberto" que muda para `concluido` e some da página atual.

## O que não foi alterado

- Não houve alteração nas RPCs.
- Não houve alteração nas regras de negócio de status.
- Não houve alteração no layout da lista ou do modal.
- Não houve `window.location.reload()` nem refresh de página.

## Pontos para o humano verificar

- Confirmar entrega de um pedido na aba "Em Aberto": a linha deve atualizar ou sair da lista sem F5.
- Se o pedido virar "Concluído", ele deve aparecer na aba "Concluídos".
- Fechar o modal sem confirmar não deve mudar a lista.
