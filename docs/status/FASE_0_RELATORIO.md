# Relatório Fase 0 — Pedidos

Data: 2026-05-06
Plano: `docs/andamento/PLANO_OPERACIONAL_PADRONIZACAO_PEDIDOS.md`

## O que foi feito

- Inventário dos arquivos de Pedidos em `src/react/features/pedidos`.
- Separação explícita entre Pedidos e PDV, porque PDV está na mesma feature mas só pode ser tocado na Fase 5.
- Mapeamento de duplicações com `shared/` e padrões de Clientes/Produtos.
- Mapeamento de `modal-shell-*`, modais ad-hoc e regras de negócio dentro de componentes.
- Lista de queries/RPCs usadas pelo módulo e marcação dos pontos que tocam `pedido.itens`.
- Comparação visual de Pedidos com Clientes/Produtos.
- Baseline de tipagem com `npm run typecheck` e `npm run typecheck:strict`.

## O que não foi feito

- Nenhum arquivo de produto foi alterado.
- Nenhum componente novo foi criado.
- Nenhum SQL foi alterado.
- Nenhuma tela foi modificada.
- PDV não foi alterado.
- Não foi iniciada a Fase 1.

## Arquivos alterados

- `docs/status/INVENTARIO_PEDIDOS.md`
- `docs/status/FASE_0_RELATORIO.md`
- `docs/status/PENDENCIAS.md`

## Pendências geradas

- Confirmar se `PedidoRow.tsx` é código morto/legado interno antes de qualquer remoção.
- Definir se as abas de Pedidos devem virar padrão compartilhado ou continuar como exceção local.
- Tratar a mistura Pedidos/PDV na mesma pasta apenas quando o plano permitir tocar no PDV.
- Avaliar extração futura das regras de preço, prazo, total, lucro, baixa e conta a receber para hooks/services dedicados.

## Validação técnica

| Comando | Resultado |
|---|---|
| `npm run typecheck` | Passou, 0 erros. |
| `npm run typecheck:strict` | Falhou com 11 erros fora de Pedidos; Pedidos tem 0 erros strict no baseline observado. |

## Pontos para o humano verificar

- O inventário representa o módulo Pedidos como você conhece na prática?
- As divergências visuais listadas são as que mais incomodam no uso real?
- A Fase 1 pode seguir focada somente na lista de Pedidos?
- Você aprova manter PDV congelado até a Fase 5?

## Pausa obrigatória

A Fase 1 não foi iniciada. A próxima fase só deve começar com aprovação explícita.
