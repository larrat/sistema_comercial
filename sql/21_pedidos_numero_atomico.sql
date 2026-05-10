-- 21_pedidos_numero_atomico.sql
-- Corrige a causa raiz de duplicidade de numero de pedido por filial.
-- Idempotente. Aplicar primeiro em homologacao, depois de corrigir duplicidades existentes.

begin;

create table if not exists public.pedido_num_contadores (
  filial_id text primary key,
  proximo_num integer not null,
  atualizado_em timestamptz not null default now(),
  constraint ck_pedido_num_contadores_positive check (proximo_num > 0)
);

insert into public.pedido_num_contadores (filial_id, proximo_num)
select
  p.filial_id,
  coalesce(max(p.num), 0) + 1
from public.pedidos p
where p.filial_id is not null
  and trim(p.filial_id) <> ''
group by p.filial_id
on conflict (filial_id) do update set
  proximo_num = greatest(
    public.pedido_num_contadores.proximo_num,
    excluded.proximo_num
  ),
  atualizado_em = now();

create or replace function public.next_pedido_num(p_filial_id text)
returns integer
language plpgsql
as $$
declare
  v_next integer;
  v_num integer;
begin
  if p_filial_id is null or trim(p_filial_id) = '' then
    raise exception using errcode = '23514', message = 'filial_id obrigatorio';
  end if;

  if not public.can_access_filial(p_filial_id) then
    raise exception using errcode = '42501', message = 'sem acesso a filial';
  end if;

  select coalesce(max(num), 0) + 1
    into v_next
  from public.pedidos
  where filial_id = p_filial_id;

  insert into public.pedido_num_contadores (filial_id, proximo_num)
  values (p_filial_id, v_next + 1)
  on conflict (filial_id) do update set
    proximo_num = greatest(public.pedido_num_contadores.proximo_num, v_next) + 1,
    atualizado_em = now()
  returning proximo_num - 1 into v_num;

  return v_num;
end;
$$;

do $$
begin
  if exists (
    select 1
    from public.pedidos
    where filial_id is not null
    group by filial_id, num
    having count(*) > 1
  ) then
    raise notice 'Nao foi criado indice unico ux_pedidos_filial_num: ainda existem numeros duplicados por filial.';
  else
    create unique index if not exists ux_pedidos_filial_num
      on public.pedidos (filial_id, num);
  end if;
end $$;

grant select, insert, update on public.pedido_num_contadores to authenticated;
grant execute on function public.next_pedido_num(text) to authenticated;

comment on table public.pedido_num_contadores is
  'Contador transacional de numero de pedido por filial. Evita duplicidade por concorrencia de MAX(num)+1.';
comment on function public.next_pedido_num(text) is
  'Retorna o proximo numero de pedido da filial de forma atomica.';

commit;
