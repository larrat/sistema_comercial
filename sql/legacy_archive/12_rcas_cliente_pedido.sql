begin;

create table if not exists public.rcas (
  id text primary key,
  filial_id text not null,
  nome text not null,
  inicial text null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index if not exists ix_rcas_filial on public.rcas (filial_id);
create unique index if not exists ux_rcas_filial_nome on public.rcas (filial_id, lower(trim(nome)));

alter table if exists public.clientes
  add column if not exists rca_id text null references public.rcas(id) on delete set null,
  add column if not exists rca_nome text null;

create index if not exists ix_clientes_filial_rca on public.clientes (filial_id, rca_id);

alter table if exists public.pedidos
  add column if not exists rca_id text null references public.rcas(id) on delete set null,
  add column if not exists rca_nome text null;

create index if not exists ix_pedidos_filial_rca on public.pedidos (filial_id, rca_id);

update public.clientes c
set rca_nome = r.nome
from public.rcas r
where c.rca_id = r.id
  and (c.rca_nome is null or trim(c.rca_nome) = '');

update public.pedidos p
set rca_id = c.rca_id,
    rca_nome = coalesce(c.rca_nome, r.nome, p.rca_nome)
from public.clientes c
left join public.rcas r
  on r.id = c.rca_id
where p.cliente_id = c.id
  and (p.rca_id is null or trim(p.rca_id) = '');

update public.pedidos p
set rca_nome = r.nome
from public.rcas r
where p.rca_id = r.id
  and (p.rca_nome is null or trim(p.rca_nome) = '');

commit;
