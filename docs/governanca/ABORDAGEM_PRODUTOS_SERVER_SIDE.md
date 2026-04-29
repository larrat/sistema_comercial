# Abordagem — Produtos Server-Side

## Situação anterior

- `Produtos` carregava toda a tabela da filial no front.
- busca por `nome` e `sku` era client-side.
- filtro por `categoria` era client-side.
- a listagem usava `DataTable`, mas sem paginação real.

## Abordagem aplicada

1. mover a listagem principal para paginação e busca server-side
2. manter o formulário, o detalhe e as regras de preço/estoque intactos
3. tratar dependências auxiliares da tela de forma explícita:
   - categorias para o filtro
   - produtos-pai para o formulário de variante

## Escopo técnico

- `page`
- `pageSize`
- `total`
- `pageCount`
- busca server-side
- filtro server-side já existente:
  - `q`
  - `cat`
- loading ao trocar página/filtro
- retry em erro

## Decisões importantes

- a listagem principal deixa de depender da carga completa
- categorias passam a vir de uma carga auxiliar leve
- a lista de produtos-pai do formulário passa a vir de uma carga auxiliar própria

Assim, a experiência principal fica paginada sem quebrar:

- detalhe
- edição
- criação de variante

## Limites desta rodada

- sem alterar cálculo de preço
- sem alterar estoque
- sem alterar formulário
- sem alterar persistência
- sem replicar ainda para outros módulos

## Risco conhecido

A listagem atual tinha uma ordenação/hierarquia local mais livre para pai/variante.  
Com paginação server-side, a tela principal passa a refletir só a página corrente, então agrupamentos visuais entre pai e variante ficam limitados ao conjunto carregado naquela página.
