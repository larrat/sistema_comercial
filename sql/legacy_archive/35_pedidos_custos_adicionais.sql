-- 35_pedidos_custos_adicionais.sql
-- Adiciona colunas para controle de custos adicionais (frete, etc) no pedido
-- Impacta no cálculo de margem/lucro no painel gerencial

begin;

alter table public.pedidos
  add column if not exists custo_frete numeric not null default 0,
  add column if not exists outros_custos numeric not null default 0;

commit;
