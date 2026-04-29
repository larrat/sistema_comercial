# Abordagem — Clientes Server-Side

## Situação anterior

- `Clientes` carregava **todos** os registros da filial no front.
- Busca, filtro por segmento e filtro por status eram aplicados **client-side**.
- A listagem usava `DataTable`, mas sem paginação real.
- A integração atual já era via Supabase REST em `clientesApi.ts`.

## Abordagem aplicada

1. mover a listagem principal para **busca e paginação server-side**
2. manter `create/edit/delete` com o mesmo fluxo funcional
3. preservar a superfície atual de formulário e detalhe
4. tratar superfícies que ainda precisam do conjunto completo de clientes de forma **explícita e sob demanda**

## Escopo técnico

- `page`
- `pageSize`
- `total`
- `pageCount`
- busca server-side
- filtros server-side já existentes:
  - `q`
  - `seg`
  - `status`
- loading ao trocar página/filtro
- retry em erro

## Decisão importante

A aba `Segmentos` e a exportação filtrada ainda dependem de uma visão mais ampla do conjunto de clientes.

Para evitar regressão funcional:

- a **listagem principal** usa paginação server-side
- `Segmentos` e `Exportar` fazem **carga auxiliar sob demanda** com os filtros atuais

Assim, a página principal deixa de carregar tudo por padrão, mas sem perder essas superfícies.

## Limites assumidos nesta rodada

- sem alterar formulário
- sem alterar detalhe
- sem alterar regras de cadastro
- sem alterar persistência
- sem aplicar o padrão ainda a outros módulos

## Risco conhecido

A busca antiga era client-side com normalização mais permissiva.  
No Supabase REST, a busca server-side passa a depender de `ilike`, então casos com acentuação e variações muito livres podem exigir uma revisão futura mais profunda.
