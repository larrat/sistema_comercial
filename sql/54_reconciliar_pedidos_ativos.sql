-- 54_reconciliar_pedidos_ativos.sql
-- Objetivo: Reconciliar pedidos já existentes que estão ativos mas sem contas_receber nem
--           movimentações de saída de estoque. Isso acontece com pedidos que foram confirmados
--           ANTES da migration 52/53 ser aplicada ao banco.
-- 
-- Este script é idempotente — pode rodar múltiplas vezes com segurança.
-- Usa ON CONFLICT DO NOTHING em todos os inserts.
--
-- Atenção: este script APENAS cria registros faltantes. Não altera dados existentes.

begin;

do $$
declare
  v_pedido   record;
  v_item     record;
  v_conta_id text;
  v_vencimento date;
  v_mov_id   text;
  v_itens_ok integer;
begin

  -- ─────────────────────────────────────────────────────────────────
  -- PASSO 1: Criar contas_receber para pedidos ativos sem conta
  -- ─────────────────────────────────────────────────────────────────
  for v_pedido in
    select p.*
    from public.pedidos p
    where p.status not in ('orcamento', 'cancelado')
      and p.total > 0
      and not exists (
        select 1 from public.contas_receber cr
        where cr.pedido_id = p.id
      )
    order by p.data desc
  loop
    v_conta_id   := 'REC-' || v_pedido.id;
    v_vencimento := coalesce(v_pedido.data::date, now()::date);

    if    v_pedido.prazo = '7d'  then v_vencimento := v_vencimento + interval '7 days';
    elsif v_pedido.prazo = '15d' then v_vencimento := v_vencimento + interval '15 days';
    elsif v_pedido.prazo = '30d' then v_vencimento := v_vencimento + interval '30 days';
    elsif v_pedido.prazo = '60d' then v_vencimento := v_vencimento + interval '60 days';
    end if;

    insert into public.contas_receber (
      id, filial_id, pedido_id, pedido_num, cliente_id, cliente, valor, vencimento, status, obs
    ) values (
      v_conta_id,
      v_pedido.filial_id,
      v_pedido.id,
      v_pedido.num,
      v_pedido.cliente_id,
      v_pedido.cli,
      v_pedido.total,
      v_vencimento,
      'pendente',
      'Reconciliado automaticamente — pedido ativo sem conta a receber'
    )
    on conflict (id) do nothing;

    raise notice 'Conta criada para pedido #% (%)', v_pedido.num, v_pedido.id;
  end loop;

  -- ─────────────────────────────────────────────────────────────────
  -- PASSO 2: Criar baixa automática para pedidos concluídos à vista
  --          que têm conta mas ainda sem baixa
  -- ─────────────────────────────────────────────────────────────────
  for v_pedido in
    select p.*
    from public.pedidos p
    where p.status = 'concluido'
      and lower(coalesce(p.pgto,'')) in ('a_vista','avista','pix','cartao','cartao_credito','cartao_debito','dinheiro')
      and lower(coalesce(p.prazo,'')) in ('','imediato','a_vista','avista','na_entrega')
      and exists (
        -- tem conta a receber com saldo em aberto
        select 1 from public.contas_receber cr
        where cr.pedido_id = p.id
          and greatest(coalesce(cr.valor_em_aberto, coalesce(cr.valor,0) - coalesce(cr.valor_recebido,0)), 0) > 0.001
      )
      and not exists (
        -- mas ainda não tem a baixa automática
        select 1 from public.contas_receber_baixas crb
        where crb.id = 'BAIXA-AUTO-' || p.id
      )
    order by p.data desc
  loop
    v_conta_id := 'REC-' || v_pedido.id;

    insert into public.contas_receber_baixas (
      id, filial_id, conta_receber_id, pedido_id, pedido_num,
      cliente_id, cliente, valor, recebido_em, observacao
    ) values (
      'BAIXA-AUTO-' || v_pedido.id,
      v_pedido.filial_id,
      v_conta_id,
      v_pedido.id,
      v_pedido.num,
      v_pedido.cliente_id,
      v_pedido.cli,
      v_pedido.total,
      coalesce(v_pedido.entregue_em, now()),
      'Baixa automática retroativa — venda à vista concluída'
    )
    on conflict (id) do nothing;

    raise notice 'Baixa criada para pedido #% (%)', v_pedido.num, v_pedido.id;
  end loop;

  -- ─────────────────────────────────────────────────────────────────
  -- PASSO 3: Criar movimentações de saída de estoque para pedidos
  --          ativos que usam pedido_itens normalizados mas sem saída
  -- ─────────────────────────────────────────────────────────────────
  for v_pedido in
    select p.*
    from public.pedidos p
    where p.status not in ('orcamento', 'cancelado')
      and exists (
        select 1 from public.pedido_itens pi
        where pi.pedido_id = p.id and pi.qty > 0
      )
      and not exists (
        select 1 from public.movimentacoes m
        where m.id like 'MOV-SAIDA-PED-' || p.id || '-%'
      )
    order by p.data desc
  loop
    v_itens_ok := 0;

    for v_item in
      select pi.produto_id, pi.qty, pi.custo, pi.preco
      from public.pedido_itens pi
      where pi.pedido_id = v_pedido.id
        and pi.filial_id = v_pedido.filial_id
        and pi.produto_id is not null
        and pi.qty > 0
    loop
      v_mov_id := 'MOV-SAIDA-PED-' || v_pedido.id || '-' || v_item.produto_id;

      insert into public.movimentacoes (
        id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
      ) values (
        v_mov_id,
        v_pedido.filial_id,
        v_item.produto_id,
        v_item.produto_id,
        'saida',
        coalesce(v_pedido.data::date, now()::date),
        v_item.qty,
        coalesce(v_item.custo, v_item.preco, 0),
        'Saída retroativa por faturamento do Pedido #' || coalesce(v_pedido.num::text, v_pedido.id),
        extract(epoch from now())::bigint
      )
      on conflict (id) do nothing;

      v_itens_ok := v_itens_ok + 1;
    end loop;

    if v_itens_ok > 0 then
      raise notice 'Saídas de estoque criadas para pedido #% (% itens)', v_pedido.num, v_itens_ok;
    end if;
  end loop;

  -- ─────────────────────────────────────────────────────────────────
  -- PASSO 4: Fallback — pedidos com itens legados (coluna jsonb) sem movimentação
  -- ─────────────────────────────────────────────────────────────────
  for v_pedido in
    select p.*
    from public.pedidos p
    where p.status not in ('orcamento', 'cancelado')
      and p.itens is not null
      and jsonb_typeof(p.itens) = 'array'
      and jsonb_array_length(case when jsonb_typeof(p.itens) = 'array' then p.itens else '[]'::jsonb end) > 0
      and not exists (
        select 1 from public.pedido_itens pi where pi.pedido_id = p.id
      )
      and not exists (
        select 1 from public.movimentacoes m
        where m.id like 'MOV-SAIDA-PED-' || p.id || '-%'
      )
    order by p.data desc
  loop
    for v_item in
      select
        (elem ->> 'prodId')         as produto_id,
        (elem ->> 'qty')::numeric   as qty,
        (elem ->> 'custo')::numeric as custo,
        (elem ->> 'preco')::numeric as preco
      from jsonb_array_elements(v_pedido.itens) as elem
      where (elem ->> 'prodId') is not null
        and (elem ->> 'qty')::numeric > 0
    loop
      v_mov_id := 'MOV-SAIDA-PED-' || v_pedido.id || '-' || v_item.produto_id;

      insert into public.movimentacoes (
        id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
      ) values (
        v_mov_id,
        v_pedido.filial_id,
        v_item.produto_id,
        v_item.produto_id,
        'saida',
        coalesce(v_pedido.data::date, now()::date),
        v_item.qty,
        coalesce(v_item.custo, v_item.preco, 0),
        'Saída retroativa legada por faturamento do Pedido #' || coalesce(v_pedido.num::text, v_pedido.id),
        extract(epoch from now())::bigint
      )
      on conflict (id) do nothing;
    end loop;

    raise notice 'Saídas legadas de estoque criadas para pedido #% (%)', v_pedido.num, v_pedido.id;
  end loop;

end;
$$;

commit;
