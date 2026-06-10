begin;

alter table if exists public.pedidos
  add column if not exists venda_fechada boolean not null default false,
  add column if not exists venda_fechada_em timestamptz,
  add column if not exists venda_fechada_por text;

create index if not exists ix_pedidos_filial_venda_fechada
  on public.pedidos (filial_id, venda_fechada, status);

commit;
