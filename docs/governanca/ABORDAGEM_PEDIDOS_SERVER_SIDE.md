# Abordagem — Pedidos Server-Side

## Estado anterior

- `Pedidos` carregava todos os registros da filial no front.
- Busca por cliente/número, status, pagamento e período aconteciam na camada React.
- A listagem não tinha paginação real.
- Abertura de detalhe, edição e cancelamento dependiam da lista já carregada no store.

## Abordagem aplicada

- mover a listagem principal para `page/pageSize/total/pageCount` no backend;
- aplicar no servidor:
  - busca por cliente e número;
  - filtro por status;
  - filtro por pagamento;
  - filtro por período;
  - ordenação por data;
- manter criação, edição, cancelamento, cálculo e regra financeira intactos;
- preservar os KPIs e contadores da tela com uma carga-resumo separada e leve.

## Decisões de compatibilidade

- a listagem principal usa apenas a página atual;
- o resumo superior continua refletindo a carteira geral da filial, como antes;
- detalhe e formulário continuam usando o mesmo fluxo atual;
- a ordenação disponível na listagem fica limitada ao que já é seguro suportar no servidor nesta etapa.

## Fora de escopo

- alterar criação de pedido;
- alterar edição;
- alterar cancelamento;
- alterar cálculo;
- alterar status;
- alterar integração financeira.
