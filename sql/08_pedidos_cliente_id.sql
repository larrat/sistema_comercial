begin;

alter table if exists public.pedidos
  add column if not exists cliente_id text;

create index if not exists ix_pedidos_filial_cliente
  on public.pedidos (filial_id, cliente_id);

update public.pedidos p
set cliente_id = c.id
from public.clientes c
where (p.cliente_id is null or trim(p.cliente_id) = '')
  and c.filial_id = p.filial_id
  and lower(trim(coalesce(c.nome, ''))) = lower(trim(coalesce(p.cli, '')))
  and not exists (
    select 1
    from public.clientes c2
    where c2.filial_id = p.filial_id
      and lower(trim(coalesce(c2.nome, ''))) = lower(trim(coalesce(p.cli, '')))
      and c2.id <> c.id
  );

commit;
