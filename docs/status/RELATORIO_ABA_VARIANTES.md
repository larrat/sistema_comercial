# Relatório — Aba Variantes de Produtos

Última atualização: 2026-05-10

## O que foi feito

- Aba `/app/produtos/:produtoId?tab=variantes` passou a ter filtro único de período para cards, tabela e gráficos.
- Adicionados 4 cards de resumo: Saldo total, Qtde vendida, Receita e Giro médio.
- Tabela de variantes manteve as colunas originais e ganhou Vendido, Receita e Margem.
- Adicionada linha final `Total (produto pai)`, sempre visível.
- Cada variante ganhou barra de progresso proporcional ao maior saldo entre variantes.
- Gráficos atualizados para grade 2x2:
  - Qtde vendida por período.
  - Receita por período.
  - Margem por variante + produto pai.
  - Giro de estoque em dias.
- Legenda compartilhada única abaixo dos gráficos.
- Cores consistentes por variante nos gráficos e tabela.

## RPCs criadas vs. reutilizadas

| Item | Situação |
|---|---|
| RPC nova | Nenhuma. |
| `pedido_itens` | Reutilizado via PostgREST para vendas/receita por variante. |
| `movimentacoes` | Reutilizado para cálculo aproximado de saldo no período. |
| `produtos` | Reutilizado para variantes, custo, preço e margem. |

## `pedido_itens`

A tabela `pedido_itens` existe no repositório em `sql/18_pedido_itens_normalizacao.sql`, mas o código local não confirma se ela já foi aplicada em homologação/produção.

Se `pedido_itens` não existir no ambiente, a aba não quebra: vendas, receita e gráficos de venda ficam zerados, e a pendência fica registrada para aplicar/validar a migration.

## Impactos indiretos encontrados

| Área | Resultado |
|---|---|
| Aba Resumo | Não foi alterada. Não há reutilização direta dos novos cálculos na aba Resumo. |
| Aba Estoque | Não foi alterada. Não existe gráfico histórico de posição equivalente para reutilizar. |
| Banco/estoque histórico | Não foi encontrada tabela `estoque_posicao`; saldo por período usa posição atual/movimentações como aproximação. |
| Pedidos/Receber/Estoque | Nenhuma escrita foi adicionada; somente leitura de `pedido_itens`, `produtos` e `movimentacoes`. |

## Validação local

| Validação | Resultado |
|---|---|
| `npm run typecheck:strict` | Passou. |
| `npm run typecheck` | Passou. |
| `npx vitest run --config vitest.react.config.ts src/react/features/produtos/services/produtosApi.test.ts` | Passou: 1 arquivo, 23 testes. |
| `npm run build:react` | Passou, com aviso já conhecido de chunk acima de 500 kB. |

## Pontos para o humano verificar

- Alternar 30 dias, 90 dias e 12 meses atualiza cards, tabela e gráficos.
- Produto com 1 variante ainda mostra linha `Total (produto pai)`.
- Variante sem venda exibe giro como `—`/sem venda sem quebrar o gráfico.
- Margem bate com custo e preço de varejo do cadastro.
- Linha de total pai está visualmente clara.
- Se vendas vierem zeradas em homologação, confirmar se `sql/18_pedido_itens_normalizacao.sql` foi aplicado.
