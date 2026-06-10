-- 68_fix_timestamps_movimentacoes.sql
-- Objetivo: Corrigir o conflito de precisão de timestamps entre frontend e backend.
-- Causa: O JS gera ts em milissegundos (Date.now() = 13 dígitos), enquanto o PostgreSQL 
-- estava gerando em segundos (epoch = 10 dígitos). O trigger de estoque ordena por ts,
-- o que causava eventos automáticos (compras, faturamento) ficarem sempre "no passado" 
-- e serem sobrescritos por ajustes manuais.
-- Solução: Usar (extract(epoch from now()) * 1000)::bigint no backend e atualizar o histórico.

begin;

-- =====================================================================================
-- 1. ATUALIZAR TRIGGER: fn_pedidos_sync
-- =====================================================================================
create or replace function public.fn_pedidos_sync()
returns trigger
language plpgsql
security definer
as $$
declare
  v_item       record;
  v_mov_id     text;
  v_conta_id   text;
  v_vencimento date;
  v_itens_ok   integer := 0;
  v_itens_array jsonb;
  v_itens_ok_jsonb boolean;
begin
  if new.itens is not null then
    v_itens_array := public.safe_pedido_itens_jsonb(new.itens#>>'{}');
  else
    v_itens_array := '[]'::jsonb;
  end if;

  if (TG_OP = 'DELETE') then
    delete from public.movimentacoes where id like 'MOV-SAIDA-PED-' || old.id || '-%';
    delete from public.movimentacoes where id like 'MOV-CANCEL-' || old.id || '-%';
    delete from public.contas_receber_baixas where pedido_id = old.id;
    delete from public.contas_receber where pedido_id = old.id;
    return old;
  end if;

  if (TG_OP = 'INSERT' and new.status not in ('orcamento', 'cancelado')) or
     (TG_OP = 'UPDATE' and old.status = 'orcamento' and new.status not in ('orcamento', 'cancelado')) then

    for v_item in
      select pi.produto_id, pi.qty, pi.custo, pi.preco
      from public.pedido_itens pi
      where pi.pedido_id = new.id
        and pi.filial_id = new.filial_id
        and pi.produto_id is not null
        and pi.qty > 0
    loop
      v_mov_id := 'MOV-SAIDA-PED-' || new.id || '-' || v_item.produto_id;
      insert into public.movimentacoes (
        id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
      ) values (
        v_mov_id, new.filial_id,
        v_item.produto_id, v_item.produto_id,
        'saida',
        coalesce(new.data::date, now()::date),
        v_item.qty,
        coalesce(v_item.custo, v_item.preco, 0),
        'Saída automática por faturamento do Pedido #' || coalesce(new.num::text, new.id),
        (extract(epoch from now()) * 1000)::bigint
      )
      on conflict (id) do nothing;
      v_itens_ok := v_itens_ok + 1;
    end loop;

    if v_itens_ok = 0
       and jsonb_array_length(v_itens_array) > 0 then
      for v_item in
        select
          (elem ->> 'prodId')         as produto_id,
          (elem ->> 'qty')::numeric   as qty,
          (elem ->> 'custo')::numeric as custo,
          (elem ->> 'preco')::numeric as preco
        from jsonb_array_elements(v_itens_array) as elem
        where (elem ->> 'prodId') is not null
          and (elem ->> 'qty')::numeric > 0
      loop
        v_mov_id := 'MOV-SAIDA-PED-' || new.id || '-' || v_item.produto_id;
        insert into public.movimentacoes (
          id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
        ) values (
          v_mov_id, new.filial_id,
          v_item.produto_id, v_item.produto_id,
          'saida',
          coalesce(new.data::date, now()::date),
          v_item.qty,
          coalesce(v_item.custo, v_item.preco, 0),
          'Saída automática por faturamento do Pedido #' || coalesce(new.num::text, new.id),
          (extract(epoch from now()) * 1000)::bigint
        )
        on conflict (id) do nothing;
      end loop;
    end if;

    v_conta_id   := 'REC-' || new.id;
    v_vencimento := coalesce(new.data::date, now()::date);
    if    new.prazo = '7d'  then v_vencimento := v_vencimento + interval '7 days';
    elsif new.prazo = '15d' then v_vencimento := v_vencimento + interval '15 days';
    elsif new.prazo = '30d' then v_vencimento := v_vencimento + interval '30 days';
    elsif new.prazo = '60d' then v_vencimento := v_vencimento + interval '60 days';
    end if;

    insert into public.contas_receber (
      id, filial_id, pedido_id, pedido_num, cliente_id, cliente, valor, vencimento, status, obs
    ) values (
      v_conta_id,
      new.filial_id, new.id, new.num, new.cliente_id, new.cli,
      new.total, v_vencimento, 'pendente',
      'Gerado automaticamente para o Pedido #' || new.num
    )
    on conflict (id) do nothing;
  end if;

  if (TG_OP = 'UPDATE'
      and old.status not in ('orcamento', 'cancelado')
      and new.status not in ('orcamento', 'cancelado')) then

    if coalesce(new.total,0)        <> coalesce(old.total,0)        or
       coalesce(new.cli,'')         <> coalesce(old.cli,'')         or
       coalesce(new.prazo,'')       <> coalesce(old.prazo,'')       or
       coalesce(new.cliente_id,'')  <> coalesce(old.cliente_id,'')  then

      v_conta_id   := 'REC-' || new.id;
      v_vencimento := coalesce(new.data::date, now()::date);
      if    new.prazo = '7d'  then v_vencimento := v_vencimento + interval '7 days';
      elsif new.prazo = '15d' then v_vencimento := v_vencimento + interval '15 days';
      elsif new.prazo = '30d' then v_vencimento := v_vencimento + interval '30 days';
      elsif new.prazo = '60d' then v_vencimento := v_vencimento + interval '60 days';
      end if;

      update public.contas_receber
         set valor      = new.total,
             cliente    = new.cli,
             cliente_id = new.cliente_id,
             vencimento = v_vencimento
       where id = v_conta_id;

      perform public.refresh_conta_receber_saldo(v_conta_id);
    end if;

    if (new.itens is distinct from old.itens) then
      delete from public.movimentacoes where id like 'MOV-SAIDA-PED-' || new.id || '-%';
      v_itens_ok := 0;

      for v_item in
        select pi.produto_id, pi.qty, pi.custo, pi.preco
        from public.pedido_itens pi
        where pi.pedido_id = new.id
          and pi.filial_id = new.filial_id
          and pi.produto_id is not null
          and pi.qty > 0
      loop
        v_mov_id := 'MOV-SAIDA-PED-' || new.id || '-' || v_item.produto_id;
        insert into public.movimentacoes (
          id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
        ) values (
          v_mov_id, new.filial_id,
          v_item.produto_id, v_item.produto_id,
          'saida', coalesce(new.data::date, now()::date),
          v_item.qty, coalesce(v_item.custo, v_item.preco, 0),
          'Saída automática por faturamento do Pedido #' || coalesce(new.num::text, new.id),
          (extract(epoch from now()) * 1000)::bigint
        )
        on conflict (id) do nothing;
        v_itens_ok := v_itens_ok + 1;
      end loop;

      if v_itens_ok = 0
         and jsonb_array_length(v_itens_array) > 0 then
        for v_item in
          select
            (elem ->> 'prodId')         as produto_id,
            (elem ->> 'qty')::numeric   as qty,
            (elem ->> 'custo')::numeric as custo,
            (elem ->> 'preco')::numeric as preco
          from jsonb_array_elements(v_itens_array) as elem
          where (elem ->> 'prodId') is not null
            and (elem ->> 'qty')::numeric > 0
        loop
          v_mov_id := 'MOV-SAIDA-PED-' || new.id || '-' || v_item.produto_id;
          insert into public.movimentacoes (
            id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
          ) values (
            v_mov_id, new.filial_id,
            v_item.produto_id, v_item.produto_id,
            'saida', coalesce(new.data::date, now()::date),
            v_item.qty, coalesce(v_item.custo, v_item.preco, 0),
            'Saída automática por faturamento do Pedido #' || coalesce(new.num::text, new.id),
            (extract(epoch from now()) * 1000)::bigint
          )
          on conflict (id) do nothing;
        end loop;
      end if;
    end if;
  end if;

  if new.status in ('concluido', 'entregue_pago') and
     lower(coalesce(new.pgto, '')) in ('dinheiro', 'pix', 'cartao_debito', 'debito', 'avista', 'a_vista', 'cartao', 'cartao_credito', 'credito', 'misto') then

    v_conta_id   := 'REC-' || new.id;
    v_vencimento := coalesce(new.data::date, now()::date);

    if not exists (select 1 from public.contas_receber where id = v_conta_id) then
      insert into public.contas_receber (
        id, filial_id, pedido_id, pedido_num, cliente_id, cliente, valor, vencimento, status, obs
      ) values (
        v_conta_id,
        new.filial_id, new.id, new.num, new.cliente_id, new.cli,
        new.total, v_vencimento, 'pendente',
        'Gerado automaticamente para o Pedido #' || new.num
      )
      on conflict (id) do nothing;
    end if;

    if not exists (
      select 1 from public.contas_receber_baixas
       where id = 'BAIXA-AUTO-' || new.id
    ) and exists (
      select 1 from public.contas_receber
       where id = v_conta_id
         and coalesce(valor_em_aberto,
               greatest(coalesce(valor,0) - coalesce(valor_recebido,0), 0)) > 0
    ) then
      insert into public.contas_receber_baixas (
        id, filial_id, conta_receber_id, pedido_id, pedido_num,
        cliente_id, cliente, valor, recebido_em, observacao
      ) values (
        'BAIXA-AUTO-' || new.id,
        new.filial_id, v_conta_id, new.id, new.num,
        new.cliente_id, new.cli,
        new.total, now(),
        'Baixa automática — Venda à Vista'
      );
    end if;
  end if;

  if (TG_OP = 'UPDATE'
      and old.status not in ('orcamento', 'cancelado')
      and new.status = 'orcamento') then
    delete from public.movimentacoes where id like 'MOV-SAIDA-PED-' || new.id || '-%';
    delete from public.movimentacoes where id like 'MOV-CANCEL-'   || new.id || '-%';
    delete from public.contas_receber_baixas where pedido_id = new.id;
    delete from public.contas_receber            where pedido_id = new.id;
  end if;

  if (TG_OP = 'UPDATE'
      and old.status not in ('orcamento', 'cancelado')
      and new.status = 'cancelado') then

    perform set_config('app.cr_skip_sync', '1', true);
    delete from public.contas_receber_baixas where pedido_id = new.id;
    perform set_config('app.cr_skip_sync', '0', true);

    update public.contas_receber
       set status               = 'cancelado',
           valor_recebido       = 0,
           valor_em_aberto      = 0,
           recebido_em          = null,
           ultimo_recebimento_em = null
     where pedido_id = new.id;

    v_itens_ok := 0;
    for v_item in
      select pi.produto_id, pi.qty, pi.custo, pi.preco
      from public.pedido_itens pi
      where pi.pedido_id = new.id
        and pi.filial_id = new.filial_id
        and pi.produto_id is not null
        and pi.qty > 0
    loop
      v_mov_id := 'MOV-CANCEL-' || new.id || '-' || v_item.produto_id
                  || '-' || (extract(epoch from now()) * 1000)::bigint;
      insert into public.movimentacoes (
        id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
      ) values (
        v_mov_id, new.filial_id,
        v_item.produto_id, v_item.produto_id,
        'entrada', now()::date,
        v_item.qty, coalesce(v_item.custo, v_item.preco, 0),
        'Devolução automática por cancelamento do Pedido #' || coalesce(new.num::text, new.id),
        (extract(epoch from now()) * 1000)::bigint
      )
      on conflict (id) do nothing;
      v_itens_ok := v_itens_ok + 1;
    end loop;

    if v_itens_ok = 0
       and jsonb_array_length(v_itens_array) > 0 then
      for v_item in
        select
          (elem ->> 'prodId')         as produto_id,
          (elem ->> 'qty')::numeric   as qty,
          (elem ->> 'custo')::numeric as custo,
          (elem ->> 'preco')::numeric as preco
        from jsonb_array_elements(v_itens_array) as elem
        where (elem ->> 'prodId') is not null
          and (elem ->> 'qty')::numeric > 0
      loop
        v_mov_id := 'MOV-CANCEL-' || new.id || '-' || v_item.produto_id
                    || '-' || (extract(epoch from now()) * 1000)::bigint;
        insert into public.movimentacoes (
          id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
        ) values (
          v_mov_id, new.filial_id,
          v_item.produto_id, v_item.produto_id,
          'entrada', now()::date,
          v_item.qty, coalesce(v_item.custo, v_item.preco, 0),
          'Devolução automática por cancelamento do Pedido #' || coalesce(new.num::text, new.id),
          (extract(epoch from now()) * 1000)::bigint
        )
        on conflict (id) do nothing;
      end loop;
    end if;
  end if;

  return new;
end;
$$;


-- =====================================================================================
-- 2. ATUALIZAR RPC: pedido_cancelar_seguro
-- =====================================================================================
create or replace function public.pedido_cancelar_seguro(
  p_pedido_id   text,
  p_motivo      text default 'Cancelado pelo operador'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_pedido          public.pedidos%rowtype;
  v_conta           record;
  v_item            record;
  v_mov_id          text;
  v_estornos        integer := 0;
  v_contas_cancel   integer := 0;
  v_itens_ok        integer := 0;
begin
  select * into v_pedido
  from public.pedidos
  where id = p_pedido_id
  limit 1 for update;

  if not found then
    raise exception 'Pedido não encontrado: %', coalesce(p_pedido_id, '(null)');
  end if;

  if coalesce(v_pedido.status, '') = 'cancelado' then
    return jsonb_build_object('ok', true, 'ja_cancelado', true, 'pedido_id', p_pedido_id);
  end if;

  for v_conta in
    select c.id
    from public.contas_receber c
    where c.pedido_id = p_pedido_id
    for update
  loop
    perform set_config('app.cr_skip_sync', '1', true);
    delete from public.contas_receber_baixas where conta_receber_id = v_conta.id;
    perform set_config('app.cr_skip_sync', '0', true);

    update public.contas_receber
    set status = 'cancelado', valor_recebido = 0, valor_em_aberto = 0,
        recebido_em = null, ultimo_recebimento_em = null
    where id = v_conta.id;
    v_contas_cancel := v_contas_cancel + 1;
  end loop;

  for v_item in
    select pi.produto_id, pi.qty, pi.custo, pi.preco
    from public.pedido_itens pi
    where pi.pedido_id = p_pedido_id and pi.filial_id = v_pedido.filial_id
      and pi.produto_id is not null and pi.qty > 0
  loop
    v_mov_id := 'MOV-CANCEL-' || p_pedido_id || '-' || v_item.produto_id || '-' || (extract(epoch from now()) * 1000)::bigint;
    insert into public.movimentacoes (
      id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
    ) values (
      v_mov_id, v_pedido.filial_id, v_item.produto_id, v_item.produto_id, 'entrada',
      now()::date, v_item.qty, coalesce(v_item.custo, v_item.preco, 0),
      'Devolução automática por cancelamento do Pedido #' || coalesce(v_pedido.num::text, p_pedido_id),
      (extract(epoch from now()) * 1000)::bigint
    ) on conflict (id) do nothing;
    v_itens_ok := v_itens_ok + 1;
  end loop;

  if v_itens_ok = 0 and v_pedido.itens is not null then
    for v_item in
      select (elem ->> 'prodId') as produto_id, (elem ->> 'qty')::numeric as qty,
             (elem ->> 'custo')::numeric as custo, (elem ->> 'preco')::numeric as preco
      from jsonb_array_elements(v_pedido.itens) as elem
      where (elem ->> 'prodId') is not null and (elem ->> 'qty')::numeric > 0
    loop
      v_mov_id := 'MOV-CANCEL-' || p_pedido_id || '-' || v_item.produto_id || '-' || (extract(epoch from now()) * 1000)::bigint;
      insert into public.movimentacoes (
        id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
      ) values (
        v_mov_id, v_pedido.filial_id, v_item.produto_id, v_item.produto_id, 'entrada',
        now()::date, v_item.qty, coalesce(v_item.custo, v_item.preco, 0),
        'Devolução automática por cancelamento do Pedido #' || coalesce(v_pedido.num::text, p_pedido_id),
        (extract(epoch from now()) * 1000)::bigint
      ) on conflict (id) do nothing;
      v_itens_ok := v_itens_ok + 1;
    end loop;
  end if;

  update public.pedidos
  set status = 'cancelado',
      obs = coalesce(obs, '') || case when coalesce(obs, '') <> '' then ' | ' else '' end || '[CANCELADO: ' || p_motivo || ' em ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || ']'
  where id = p_pedido_id
  returning * into v_pedido;

  return jsonb_build_object(
    'ok', true, 'pedido_id', p_pedido_id, 'pedido_num', v_pedido.num,
    'contas_canceladas', v_contas_cancel, 'itens_estoque_revertidos', v_itens_ok,
    'cancelado_em', now()
  );
end;
$$;


-- =====================================================================================
-- 3. ATUALIZAR RPC: pedido_compra_cancelar_seguro
-- =====================================================================================
create or replace function public.pedido_compra_cancelar_seguro(
  p_pedido_compra_id text,
  p_motivo           text default 'Cancelado pelo operador'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_pedido          record;
  v_item            record;
  v_mov_id          text;
  v_itens_revertidos integer := 0;
  v_conta_cancelada  boolean := false;
begin
  select * into v_pedido from public.pedidos_compra
  where id = p_pedido_compra_id limit 1 for update;

  if not found then
    raise exception 'Pedido de compra não encontrado: %', coalesce(p_pedido_compra_id, '(null)');
  end if;

  if coalesce(v_pedido.status, '') = 'cancelado' then
    return jsonb_build_object('ok', true, 'ja_cancelado', true, 'pedido_id', p_pedido_compra_id);
  end if;

  if coalesce(v_pedido.status, '') = 'aberto' then
    update public.pedidos_compra set status = 'cancelado' where id = p_pedido_compra_id;
    return jsonb_build_object('ok', true, 'pedido_id', p_pedido_compra_id, 'itens_revertidos', 0, 'conta_pagar_cancelada', false);
  end if;

  for v_item in
    select produto_id, qty, custo_unitario from public.pedido_compra_itens
    where pedido_compra_id = p_pedido_compra_id and produto_id is not null and qty > 0
  loop
    v_mov_id := 'MOV-COMPRA-CANCEL-' || p_pedido_compra_id || '-' || v_item.produto_id
                || '-' || (extract(epoch from now()) * 1000)::bigint;
    insert into public.movimentacoes (
      id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
    ) values (
      v_mov_id, v_pedido.filial_id, v_item.produto_id, v_item.produto_id, 'saida',
      now()::date, v_item.qty, coalesce(v_item.custo_unitario, 0),
      'Saída automática por cancelamento do Pedido de Compra ' || p_pedido_compra_id,
      (extract(epoch from now()) * 1000)::bigint
    ) on conflict (id) do nothing;
    v_itens_revertidos := v_itens_revertidos + 1;
  end loop;

  update public.contas_pagar set status = 'cancelado'
  where pedido_compra_id = p_pedido_compra_id and status in ('pendente', 'pago');
  get diagnostics v_conta_cancelada = row_count;

  update public.pedidos_compra set status = 'cancelado' where id = p_pedido_compra_id;

  return jsonb_build_object(
    'ok', true, 'pedido_id', p_pedido_compra_id,
    'itens_revertidos', v_itens_revertidos, 'conta_pagar_cancelada', v_conta_cancelada,
    'cancelado_em', now()
  );
end;
$$;


-- =====================================================================================
-- 4. ATUALIZAR RPC: pedido_compra_finalizar_seguro
-- =====================================================================================
create or replace function public.pedido_compra_finalizar_seguro(
  p_pedido_compra_id text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_pedido           record;
  v_item             record;
  v_mov_id           text;
  v_itens_processados integer := 0;
  v_is_a_vista       boolean := false;
  v_status_conta     text;
  v_vencimento_conta date;
  v_hoje             date := now()::date;
  v_venc_30d         date := (now() + interval '30 days')::date;
begin
  select * into v_pedido from public.pedidos_compra
  where id = p_pedido_compra_id limit 1 for update;

  if not found then
    raise exception 'Pedido de compra não encontrado: %', coalesce(p_pedido_compra_id, '(null)');
  end if;

  if coalesce(v_pedido.status, '') = 'finalizado' then
    return jsonb_build_object('ok', true, 'ja_finalizado', true, 'pedido_id', p_pedido_compra_id);
  end if;

  if coalesce(v_pedido.status, '') = 'cancelado' then
    raise exception 'Não é possível finalizar um pedido de compra que foi cancelado.';
  end if;

  for v_item in
    select produto_id, nome, qty, custo_unitario from public.pedido_compra_itens
    where pedido_compra_id = p_pedido_compra_id and produto_id is not null and qty > 0
  loop
    v_mov_id := 'MOV-PC-' || p_pedido_compra_id || '-' || v_item.produto_id 
                || '-' || (extract(epoch from now()) * 1000)::bigint;

    insert into public.movimentacoes (
      id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
    ) values (
      v_mov_id, v_pedido.filial_id, v_item.produto_id, v_item.produto_id, 'entrada',
      v_hoje, v_item.qty, coalesce(v_item.custo_unitario, 0),
      'Entrada automática via Pedido de Compra ' || p_pedido_compra_id || ' — ' || v_pedido.fornecedor_nome,
      (extract(epoch from now()) * 1000)::bigint
    ) on conflict (id) do nothing;

    update public.produtos
    set custo = coalesce(v_item.custo_unitario, 0)
    where id = v_item.produto_id;

    v_itens_processados := v_itens_processados + 1;
  end loop;

  v_is_a_vista := lower(coalesce(v_pedido.forma_pagamento, '')) in ('dinheiro', 'pix', 'cartao_debito', 'debito', 'avista', 'a_vista');

  if v_is_a_vista then
    v_status_conta := 'pago'; v_vencimento_conta := v_hoje;
  else
    v_status_conta := 'pendente'; v_vencimento_conta := v_venc_30d;
  end if;

  insert into public.contas_pagar (
    id, filial_id, pedido_compra_id, fornecedor_nome, valor, vencimento, status, categoria
  ) values (
    'CP-' || p_pedido_compra_id, v_pedido.filial_id, p_pedido_compra_id,
    v_pedido.fornecedor_nome, v_pedido.total, v_vencimento_conta, v_status_conta, 'compra'
  ) on conflict (id) do update
  set status = excluded.status, valor = excluded.valor, vencimento = excluded.vencimento;

  if v_is_a_vista then
    insert into public.caixa_transacoes (
      filial_id, tipo, valor, categoria_id, descricao, entidade_id, entidade_tipo
    ) values (
      v_pedido.filial_id, 'saida', v_pedido.total, 'compra',
      'Compra à vista: ' || v_pedido.fornecedor_nome || ' — Pedido ' || substring(p_pedido_compra_id from 1 for 8),
      p_pedido_compra_id, 'fornecedor'
    );
  end if;

  update public.pedidos_compra
  set status = 'finalizado', finalizado_em = now()
  where id = p_pedido_compra_id;

  return jsonb_build_object(
    'ok', true, 'pedido_id', p_pedido_compra_id, 'itens_processados', v_itens_processados,
    'caixa_debitado', v_is_a_vista, 'finalizado_em', now()
  );
end;
$$;


-- =====================================================================================
-- 5. BACKFILL: CORRIGIR HISTÓRICO E RECALCULAR ESTOQUE GERAL
-- =====================================================================================
DO $$ 
DECLARE
  v_prod record;
  v_mov record;
  v_saldo numeric;
BEGIN
  -- 5.1. Transforma todos os timestamps antigos de segundos para milissegundos
  -- Utilizamos a barreira de 100.000.000.000 (ano 5138 em segundos)
  UPDATE public.movimentacoes
  SET ts = ts * 1000
  WHERE ts < 100000000000;

  -- 5.2. Recalcula o saldo final na tabela 'produtos' para TODOS os produtos e filiais
  -- garantindo que a nova ordem cronológica restaurará o saldo oculto das compras.
  FOR v_prod IN
    SELECT DISTINCT prod_id, filial_id 
    FROM public.movimentacoes
    WHERE prod_id IS NOT NULL
  LOOP
    v_saldo := 0;

    -- Simula a execução sequencial exata que o trigger de stock faria
    FOR v_mov IN
      SELECT tipo, qty, saldo_real 
      FROM public.movimentacoes 
      WHERE prod_id = v_prod.prod_id AND filial_id = v_prod.filial_id
      ORDER BY ts ASC, criado_em ASC
    LOOP
      IF v_mov.tipo = 'entrada' THEN
        v_saldo := v_saldo + coalesce(v_mov.qty, 0);
      ELSIF v_mov.tipo = 'saida' OR v_mov.tipo = 'transf' THEN
        v_saldo := v_saldo - coalesce(v_mov.qty, 0);
      ELSIF v_mov.tipo = 'ajuste' THEN
        v_saldo := coalesce(v_mov.saldo_real, 0);
      END IF;
    END LOOP;

    -- Atualiza o estoque final
    UPDATE public.produtos
    SET esal = coalesce(v_saldo, 0),
        atualizado_em = now()
    WHERE id = v_prod.prod_id AND filial_id = v_prod.filial_id;
  END LOOP;
END $$;

commit;
