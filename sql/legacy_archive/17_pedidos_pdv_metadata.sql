begin;

alter table if exists public.pedidos
  add column if not exists origem_venda text,
  add column if not exists pgto_meta jsonb;

create index if not exists ix_pedidos_filial_origem_venda
  on public.pedidos (filial_id, origem_venda);

commit;
