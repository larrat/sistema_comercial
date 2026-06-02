-- Script de correção: Lendo os itens do Pedido #14 do JSONB (legado) e devolvendo para o Estoque

begin;

do $$
declare
  v_pedido record;
  v_item record;
  v_count integer := 0;
begin
  -- 1. Encontra o pedido #14
  select id, filial_id, itens
  into v_pedido
  from public.pedidos
  where num = 14
  limit 1;

  if v_pedido.id is null then
    raise notice 'Pedido #14 não encontrado!';
    return;
  end if;

  if v_pedido.itens is null or jsonb_array_length(v_pedido.itens) = 0 then
    raise notice 'O Pedido #14 não possui itens no JSONB.';
    return;
  end if;

  -- 2. Varre os itens no JSONB para devolver o estoque
  for v_item in
    select
      (elem ->> 'prodId') as produto_id,
      (elem ->> 'qty')::numeric as qty,
      (elem ->> 'custo')::numeric as custo,
      (elem ->> 'preco')::numeric as preco
    from jsonb_array_elements(v_pedido.itens) as elem
    where (elem ->> 'prodId') is not null
      and (elem ->> 'qty')::numeric > 0
  loop
    insert into public.movimentacoes (
      id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
    ) values (
      'MOV-CANCEL-JSONB-' || v_pedido.id || '-' || v_item.produto_id || '-' || extract(epoch from now())::bigint,
      v_pedido.filial_id,
      v_item.produto_id,
      v_item.produto_id,
      'entrada',
      now()::date,
      v_item.qty,
      coalesce(v_item.custo, v_item.preco, 0),
      'Devolução forçada via admin (Pedido #14 - Legado JSONB)',
      extract(epoch from now())::bigint
    )
    on conflict (id) do nothing;
    
    v_count := v_count + 1;
  end loop;

  raise notice 'Estorno concluído! Foram devolvidos % itens do JSONB legado para o estoque.', v_count;

end;
$$;

commit;
