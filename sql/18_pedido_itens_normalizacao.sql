-- 18_pedido_itens_normalizacao.sql
-- Objetivo: criar leitura normalizada para itens de pedido sem remover o agregado legado pedidos.itens.
-- Idempotente: pode rodar mais de uma vez.
-- Observacao: PDV continua gravando somente o agregado ate a Fase 5.

begin;

create table if not exists public.pedido_itens (
  id text primary key,
  filial_id text not null,
  pedido_id text not null references public.pedidos(id) on delete cascade,
  produto_id text references public.produtos(id) on delete set null,
  linha integer not null,
  nome text not null default '',
  un text not null default 'un',
  qty numeric not null default 0,
  preco numeric not null default 0,
  custo numeric not null default 0,
  custo_base numeric,
  preco_base numeric,
  orig text,
  item jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint uq_pedido_itens_pedido_linha unique (pedido_id, linha)
);

create index if not exists ix_pedido_itens_filial_pedido
  on public.pedido_itens (filial_id, pedido_id);

create index if not exists ix_pedido_itens_filial_produto
  on public.pedido_itens (filial_id, produto_id)
  where produto_id is not null;

create index if not exists ix_pedido_itens_pedido_linha
  on public.pedido_itens (pedido_id, linha);

create or replace function public.safe_pedido_itens_jsonb(p_itens text)
returns jsonb
language plpgsql
immutable
as $$
begin
  if p_itens is null or btrim(p_itens) = '' then
    return '[]'::jsonb;
  end if;

  if jsonb_typeof(p_itens::jsonb) = 'array' then
    return p_itens::jsonb;
  end if;

  return '[]'::jsonb;
exception when others then
  return '[]'::jsonb;
end;
$$;

create or replace function public.safe_pedido_item_numeric(p_value text)
returns numeric
language plpgsql
immutable
as $$
begin
  if p_value is null or btrim(p_value) = '' then
    return null;
  end if;

  return p_value::numeric;
exception when others then
  return null;
end;
$$;

create or replace function public.touch_pedido_itens_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_pedido_itens_touch on public.pedido_itens;
create trigger trg_pedido_itens_touch
before update on public.pedido_itens
for each row execute function public.touch_pedido_itens_atualizado_em();

with pedidos_parseados as (
  select
    p.id as pedido_id,
    p.filial_id,
    public.safe_pedido_itens_jsonb(p.itens::text) as itens_json
  from public.pedidos p
  where p.itens is not null
),
itens_expandidos as (
  select
    pp.pedido_id,
    pp.filial_id,
    item.value as item_json,
    item.ordinality::integer as linha
  from pedidos_parseados pp
  cross join lateral jsonb_array_elements(pp.itens_json) with ordinality as item(value, ordinality)
)
insert into public.pedido_itens (
  id,
  filial_id,
  pedido_id,
  produto_id,
  linha,
  nome,
  un,
  qty,
  preco,
  custo,
  custo_base,
  preco_base,
  orig,
  item
)
select
  ie.pedido_id || ':' || ie.linha::text as id,
  ie.filial_id,
  ie.pedido_id,
  pr.id as produto_id,
  ie.linha,
  coalesce(ie.item_json->>'nome', '') as nome,
  coalesce(nullif(ie.item_json->>'un', ''), 'un') as un,
  coalesce(public.safe_pedido_item_numeric(ie.item_json->>'qty'), 0) as qty,
  coalesce(public.safe_pedido_item_numeric(ie.item_json->>'preco'), 0) as preco,
  coalesce(public.safe_pedido_item_numeric(ie.item_json->>'custo'), 0) as custo,
  public.safe_pedido_item_numeric(ie.item_json->>'custo_base') as custo_base,
  public.safe_pedido_item_numeric(ie.item_json->>'preco_base') as preco_base,
  nullif(ie.item_json->>'orig', '') as orig,
  ie.item_json as item
from itens_expandidos ie
left join public.produtos pr
  on pr.id = nullif(ie.item_json->>'prodId', '')
  and pr.filial_id = ie.filial_id
on conflict (pedido_id, linha) do update set
  filial_id = excluded.filial_id,
  produto_id = excluded.produto_id,
  nome = excluded.nome,
  un = excluded.un,
  qty = excluded.qty,
  preco = excluded.preco,
  custo = excluded.custo,
  custo_base = excluded.custo_base,
  preco_base = excluded.preco_base,
  orig = excluded.orig,
  item = excluded.item;

alter table public.pedido_itens enable row level security;

drop policy if exists p_pedido_itens_all on public.pedido_itens;
create policy p_pedido_itens_all on public.pedido_itens
for all to authenticated
using (public.can_access_filial(filial_id))
with check (public.can_access_filial(filial_id));

grant select, insert, update, delete on public.pedido_itens to authenticated;
grant execute on function public.safe_pedido_itens_jsonb(text) to authenticated;
grant execute on function public.safe_pedido_item_numeric(text) to authenticated;

comment on table public.pedido_itens is
  'Itens normalizados de pedidos. Criada na Fase 4; pedidos.itens segue mantido como agregado legado.';

comment on column public.pedidos.itens is
  'Agregado legado de itens. Mantido para compatibilidade ate dual-write do PDV/Fase 5; preferir public.pedido_itens para leitura.';

commit;
