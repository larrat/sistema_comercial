-- ==============================================================================
-- 78_otimizacao_kardex_indexes.sql
-- Aplicação da skill: postgresql-optimization
-- Benefício: Acelera o gatilho de sincronização de estoque e consultas da UI
-- ==============================================================================

begin;

-- 1. Otimização do Kardex (movimentacoes)
-- A query do trigger 34 varre "where prod_id = X and filial_id = Y order by ts asc, criado_em asc"
-- Um índice composto e ordenado cobre perfeitamente essa busca pesada.
create index if not exists idx_movimentacoes_prod_filial_ts 
  on public.movimentacoes (prod_id, filial_id, ts asc, criado_em asc);

-- 2. Otimização de Deleções e Updates de Pedidos (pedido_itens)
-- Ao cancelar um pedido, buscamos seus itens: "where pedido_id = X"
create index if not exists idx_pedido_itens_pedido_id 
  on public.pedido_itens (pedido_id);

-- 3. Otimização da Tabela de Pedidos
-- Filtros comuns na UI: status, cliente e filial
create index if not exists idx_pedidos_status 
  on public.pedidos (status);

create index if not exists idx_pedidos_cliente_id 
  on public.pedidos (cli_id);

-- 4. Otimização de Busca por Texto (Listagem de Produtos e Clientes)
-- Para buscas ILIKE que não usam pg_trgm, índices B-Tree normais não ajudam.
-- Habilitamos pg_trgm e criamos um índice trigram para o nome do produto.
create extension if not exists pg_trgm;

create index if not exists idx_produtos_nome_trgm 
  on public.produtos using gin (nome gin_trgm_ops);

commit;
