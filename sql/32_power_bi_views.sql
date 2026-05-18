-- 32_power_bi_views.sql
-- Objetivo: Criar views PostgreSQL limpas, otimizadas e no padrão Star Schema (Fato/Dimensão)
-- para conexão direta com o Power BI Desktop / Cloud.
--
-- Segurança: Grant de leitura (SELECT) concedido explicitamente.

begin;

-- ==========================================
-- 1. Dimensão Clientes (d_clientes)
-- ==========================================
create or replace view public.v_pbi_d_clientes as
select 
  id as cliente_id,
  nome as cliente_nome,
  doc as cliente_documento,
  email as cliente_email,
  tel as cliente_telefone,
  coalesce(canal, 'Direto') as cliente_canal,
  created_at as cliente_cadastro_data
from public.clientes;

comment on view public.v_pbi_d_clientes is 'Dimensão Clientes para o Power BI (v_pbi_d_clientes)';

-- ==========================================
-- 2. Dimensão Produtos (d_produtos)
-- ==========================================
create or replace view public.v_pbi_d_produtos as
select
  id as produto_id,
  sku as produto_sku,
  nome as produto_nome,
  coalesce(cat, 'Sem Categoria') as produto_categoria,
  coalesce(un, 'un') as produto_unidade,
  coalesce(preco, 0) as produto_preco_venda,
  coalesce(mkv, 0) as produto_markup,
  is_active as produto_ativo
from public.produtos;

comment on view public.v_pbi_d_produtos is 'Dimensão Produtos para o Power BI (v_pbi_d_produtos)';

-- ==========================================
-- 3. Dimensão Filiais (d_filiais)
-- ==========================================
create or replace view public.v_pbi_d_filiais as
select
  id as filial_id,
  nome as filial_nome,
  coalesce(uf, 'BR') as filial_uf,
  criado_em as filial_cadastro_data
from public.filiais;

comment on view public.v_pbi_d_filiais is 'Dimensão Filiais para o Power BI (v_pbi_d_filiais)';

-- ==========================================
-- 4. Tabela Fato Vendas e Itens (f_vendas)
-- ==========================================
create or replace view public.v_pbi_f_vendas as
select
  pi.id as item_venda_id,
  pi.pedido_id,
  pi.filial_id,
  p.cliente_id,
  pi.produto_id,
  p.criado_em as venda_data,
  p.status as venda_status,
  pi.qty as venda_quantidade,
  pi.preco as venda_preco_unitario,
  coalesce(pi.custo, 0) as venda_custo_unitario,
  (pi.qty * pi.preco) as faturamento_bruto,
  (pi.qty * coalesce(pi.custo, 0)) as custo_total,
  ((pi.qty * pi.preco) - (pi.qty * coalesce(pi.custo, 0))) as margem_contribuicao
from public.pedido_itens pi
join public.pedidos p on p.id = pi.pedido_id
where p.status != 'cancelado';

comment on view public.v_pbi_f_vendas is 'Tabela Fato Vendas (Itens de Pedido) para o Power BI (v_pbi_f_vendas)';

-- ==========================================
-- 5. Tabela Fato Caixa (f_caixa)
-- ==========================================
create or replace view public.v_pbi_f_caixa as
select
  t.id as transacao_id,
  t.filial_id,
  t.criado_em as caixa_data,
  t.tipo as caixa_tipo, -- 'entrada' ou 'saida'
  c.nome as caixa_categoria_nome,
  t.valor as caixa_valor,
  (case when t.tipo = 'saida' then -t.valor else t.valor end) as caixa_valor_sinalizado,
  t.descricao as transacao_descricao
from public.transacoes_caixa t
left join public.caixa_categorias c on c.id = t.categoria_id;

comment on view public.v_pbi_f_caixa is 'Tabela Fato Movimentações de Caixa para o Power BI (v_pbi_f_caixa)';

-- ==========================================
-- Permissões de Leitura para Roles
-- ==========================================
grant select on public.v_pbi_d_clientes to authenticated;
grant select on public.v_pbi_d_produtos to authenticated;
grant select on public.v_pbi_d_filiais to authenticated;
grant select on public.v_pbi_f_vendas to authenticated;
grant select on public.v_pbi_f_caixa to authenticated;

commit;
