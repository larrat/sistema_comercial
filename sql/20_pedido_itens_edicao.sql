-- 20_pedido_itens_edicao.sql
-- Edita itens de pedido por RPC, mantendo pedido_itens como fonte preferencial e pedidos.itens como agregado legado.
-- Idempotente: pode rodar mais de uma vez. Aplicar primeiro em homologacao.

begin;

create or replace function public.pedido_status_permite_edicao_itens(p_status text)
returns boolean
language sql
stable
as $$
  select coalesce(p_status, '') in ('em_andamento', 'em_separacao', 'pago_aguardando_entrega');
$$;

create or replace function public.pedido_item_assert_editavel(p_pedido_id text)
returns public.pedidos
language plpgsql
as $$
declare
  v_pedido public.pedidos%rowtype;
begin
  if p_pedido_id is null or trim(p_pedido_id) = '' then
    raise exception using errcode = '23514', message = 'pedido_id obrigatorio';
  end if;

  select *
    into v_pedido
  from public.pedidos
  where id = p_pedido_id
  limit 1
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'pedido nao encontrado';
  end if;

  if not public.can_access_filial(v_pedido.filial_id) then
    raise exception using errcode = '42501', message = 'sem acesso a filial do pedido';
  end if;

  if public.current_user_role() <> 'admin' then
    raise exception using errcode = '42501', message = 'somente admin pode editar itens do pedido';
  end if;

  if not public.pedido_status_permite_edicao_itens(v_pedido.status) then
    raise exception using errcode = '23514', message = 'status do pedido nao permite editar itens';
  end if;

  return v_pedido;
end;
$$;

create or replace function public.pedido_item_sync_agregado(p_pedido_id text)
returns public.pedidos
language plpgsql
as $$
declare
  v_total numeric := 0;
  v_itens jsonb := '[]'::jsonb;
  v_itens_type text;
  v_pedido public.pedidos%rowtype;
begin
  select coalesce(sum(coalesce(pi.qty, 0) * coalesce(pi.preco, 0)), 0)
    into v_total
  from public.pedido_itens pi
  where pi.pedido_id = p_pedido_id;

  select coalesce(
      jsonb_agg(
        jsonb_strip_nulls(
          jsonb_build_object(
            'prodId', coalesce(pi.produto_id, pi.item->>'prodId', ''),
            'item_id', pi.id,
            'linha', pi.linha,
            'nome', pi.nome,
            'un', pi.un,
            'qty', pi.qty,
            'preco', pi.preco,
            'custo', pi.custo,
            'custo_base', pi.custo_base,
            'preco_base', pi.preco_base,
            'orig', pi.orig
          )
        )
        order by pi.linha
      ),
      '[]'::jsonb
    )
    into v_itens
  from public.pedido_itens pi
  where pi.pedido_id = p_pedido_id;

  update public.pedidos
  set total = v_total
  where id = p_pedido_id;

  select a.udt_name
    into v_itens_type
  from information_schema.columns a
  where a.table_schema = 'public'
    and a.table_name = 'pedidos'
    and a.column_name = 'itens'
  limit 1;

  if v_itens_type = 'jsonb' then
    execute 'update public.pedidos set itens = $1 where id = $2' using v_itens, p_pedido_id;
  elsif v_itens_type = 'json' then
    execute 'update public.pedidos set itens = $1 where id = $2' using v_itens::json, p_pedido_id;
  else
    execute 'update public.pedidos set itens = $1 where id = $2' using v_itens::text, p_pedido_id;
  end if;

  select *
    into v_pedido
  from public.pedidos
  where id = p_pedido_id
  limit 1;

  return v_pedido;
end;
$$;

create or replace function public.pedido_item_atualizar(
  p_pedido_id text,
  p_item_id text,
  p_quantidade numeric default null,
  p_preco_unitario numeric default null
)
returns public.pedidos
language plpgsql
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_item public.pedido_itens%rowtype;
begin
  v_pedido := public.pedido_item_assert_editavel(p_pedido_id);

  if p_item_id is null or trim(p_item_id) = '' then
    raise exception using errcode = '23514', message = 'item_id obrigatorio';
  end if;

  if p_quantidade is not null and p_quantidade <= 0 then
    raise exception using errcode = '23514', message = 'quantidade deve ser maior que zero';
  end if;

  if p_preco_unitario is not null and p_preco_unitario < 0 then
    raise exception using errcode = '23514', message = 'preco deve ser maior ou igual a zero';
  end if;

  update public.pedido_itens pi
  set qty = coalesce(p_quantidade, pi.qty),
      preco = coalesce(p_preco_unitario, pi.preco),
      item = jsonb_strip_nulls(
        coalesce(pi.item, '{}'::jsonb) ||
        jsonb_build_object(
          'qty', coalesce(p_quantidade, pi.qty),
          'preco', coalesce(p_preco_unitario, pi.preco)
        )
      )
  where pi.id = p_item_id
    and pi.pedido_id = p_pedido_id
    and pi.filial_id = v_pedido.filial_id
  returning * into v_item;

  if not found then
    raise exception using errcode = 'P0002', message = 'item do pedido nao encontrado';
  end if;

  return public.pedido_item_sync_agregado(p_pedido_id);
end;
$$;

create or replace function public.pedido_item_remover(p_pedido_id text, p_item_id text)
returns public.pedidos
language plpgsql
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_count integer := 0;
begin
  v_pedido := public.pedido_item_assert_editavel(p_pedido_id);

  if p_item_id is null or trim(p_item_id) = '' then
    raise exception using errcode = '23514', message = 'item_id obrigatorio';
  end if;

  select count(*)
    into v_count
  from public.pedido_itens pi
  where pi.pedido_id = p_pedido_id;

  if v_count <= 1 then
    raise exception using errcode = '23514', message = 'nao e permitido remover o ultimo item do pedido';
  end if;

  delete from public.pedido_itens pi
  where pi.id = p_item_id
    and pi.pedido_id = p_pedido_id
    and pi.filial_id = v_pedido.filial_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'item do pedido nao encontrado';
  end if;

  return public.pedido_item_sync_agregado(p_pedido_id);
end;
$$;

create or replace function public.pedido_item_adicionar(
  p_pedido_id text,
  p_produto_id text,
  p_quantidade numeric,
  p_preco_unitario numeric
)
returns public.pedidos
language plpgsql
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_produto public.produtos%rowtype;
  v_linha integer := 1;
begin
  v_pedido := public.pedido_item_assert_editavel(p_pedido_id);

  if p_produto_id is null or trim(p_produto_id) = '' then
    raise exception using errcode = '23514', message = 'produto_id obrigatorio';
  end if;

  if p_quantidade is null or p_quantidade <= 0 then
    raise exception using errcode = '23514', message = 'quantidade deve ser maior que zero';
  end if;

  if p_preco_unitario is null or p_preco_unitario < 0 then
    raise exception using errcode = '23514', message = 'preco deve ser maior ou igual a zero';
  end if;

  select *
    into v_produto
  from public.produtos
  where id = p_produto_id
    and filial_id = v_pedido.filial_id
  limit 1;

  if not found then
    raise exception using errcode = 'P0002', message = 'produto nao encontrado';
  end if;

  select coalesce(max(linha), 0) + 1
    into v_linha
  from public.pedido_itens
  where pedido_id = p_pedido_id;

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
  ) values (
    p_pedido_id || ':' || v_linha::text,
    v_pedido.filial_id,
    p_pedido_id,
    p_produto_id,
    v_linha,
    coalesce(v_produto.nome, ''),
    coalesce(nullif(v_produto.un, ''), 'un'),
    p_quantidade,
    p_preco_unitario,
    coalesce(v_produto.custo, 0),
    coalesce(v_produto.custo, 0),
    p_preco_unitario,
    'estoque',
    jsonb_strip_nulls(jsonb_build_object(
      'prodId', p_produto_id,
      'item_id', p_pedido_id || ':' || v_linha::text,
      'linha', v_linha,
      'nome', coalesce(v_produto.nome, ''),
      'un', coalesce(nullif(v_produto.un, ''), 'un'),
      'qty', p_quantidade,
      'preco', p_preco_unitario,
      'custo', coalesce(v_produto.custo, 0),
      'custo_base', coalesce(v_produto.custo, 0),
      'preco_base', p_preco_unitario,
      'orig', 'estoque'
    ))
  );

  return public.pedido_item_sync_agregado(p_pedido_id);
end;
$$;

grant execute on function public.pedido_status_permite_edicao_itens(text) to authenticated;
grant execute on function public.pedido_item_assert_editavel(text) to authenticated;
grant execute on function public.pedido_item_sync_agregado(text) to authenticated;
grant execute on function public.pedido_item_atualizar(text, text, numeric, numeric) to authenticated;
grant execute on function public.pedido_item_remover(text, text) to authenticated;
grant execute on function public.pedido_item_adicionar(text, text, numeric, numeric) to authenticated;

comment on function public.pedido_item_atualizar(text, text, numeric, numeric) is
  'Atualiza quantidade/preco de item do pedido. Requer admin e status editavel.';
comment on function public.pedido_item_remover(text, text) is
  'Remove item do pedido sem permitir pedido vazio. Requer admin e status editavel.';
comment on function public.pedido_item_adicionar(text, text, numeric, numeric) is
  'Adiciona item ao pedido e recalcula total. Nao altera contas_receber automaticamente.';

commit;
