-- 51_pedido_compra_finalizar_seguro.sql
-- Objetivo: Criar a RPC public.pedido_compra_finalizar_seguro para finalização transacional de pedidos de compra.
-- Garante que todas as entradas no estoque (Kardex), atualizações de custo de produto, contas a pagar e saídas do caixa
-- ocorram sob uma única transação de banco. Se qualquer parte falhar, tudo é desfeito (rollback automático).

begin;

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
  -- ── 0. Carregar e travar o pedido de compra ──────────────────────────────
  select *
    into v_pedido
  from public.pedidos_compra
  where id = p_pedido_compra_id
  limit 1
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Pedido de compra não encontrado: ' || coalesce(p_pedido_compra_id, '(null)');
  end if;

  -- ── 1. Verificações de segurança e estado ────────────────────────────────
  if not public.can_access_filial(v_pedido.filial_id) then
    raise exception using
      errcode = '42501',
      message = 'Sem permissão para acessar a filial deste pedido de compra.';
  end if;

  if coalesce(v_pedido.status, '') = 'finalizado' then
    -- Idempotente: já finalizado
    return jsonb_build_object(
      'ok',            true,
      'ja_finalizado', true,
      'pedido_id',     p_pedido_compra_id
    );
  end if;

  if coalesce(v_pedido.status, '') = 'cancelado' then
    raise exception using
      errcode = 'ERR01',
      message = 'Não é possível finalizar um pedido de compra que foi cancelado.';
  end if;

  -- ── 2. Registrar entradas de estoque no Kardex e atualizar custos ──────────
  for v_item in
    select produto_id, nome, qty, custo_unitario
    from public.pedido_compra_itens
    where pedido_compra_id = p_pedido_compra_id
      and produto_id is not null
      and qty > 0
  loop
    v_mov_id := 'MOV-PC-' || p_pedido_compra_id || '-' || v_item.produto_id 
                || '-' || extract(epoch from now())::bigint;

    -- 2a. Registra a movimentação de entrada
    insert into public.movimentacoes (
      id,
      filial_id,
      prod_id,
      "prodId",
      tipo,
      data,
      qty,
      custo,
      obs,
      ts
    ) values (
      v_mov_id,
      v_pedido.filial_id,
      v_item.produto_id,
      v_item.produto_id,
      'entrada',
      v_hoje,
      v_item.qty,
      coalesce(v_item.custo_unitario, 0),
      'Entrada automática via Pedido de Compra ' || p_pedido_compra_id || ' — ' || v_pedido.fornecedor_nome,
      extract(epoch from now())::bigint
    )
    on conflict (id) do nothing;

    -- 2b. Atualiza apenas o custo do produto
    update public.produtos
    set custo = coalesce(v_item.custo_unitario, 0)
    where id = v_item.produto_id;

    v_itens_processados := v_itens_processados + 1;
  end loop;

  -- ── 3. Gerar Contas a Pagar conforme a forma de pagamento ───────────────
  v_is_a_vista := lower(coalesce(v_pedido.forma_pagamento, '')) in (
    'dinheiro', 'pix', 'cartao_debito', 'debito', 'avista', 'a_vista'
  );

  if v_is_a_vista then
    v_status_conta := 'pago';
    v_vencimento_conta := v_hoje;
  else
    v_status_conta := 'pendente';
    v_vencimento_conta := v_venc_30d;
  end if;

  insert into public.contas_pagar (
    id,
    filial_id,
    pedido_compra_id,
    fornecedor_nome,
    valor,
    vencimento,
    status,
    categoria
  ) values (
    'CP-' || p_pedido_compra_id,
    v_pedido.filial_id,
    p_pedido_compra_id,
    v_pedido.fornecedor_nome,
    v_pedido.total,
    v_vencimento_conta,
    v_status_conta,
    'compra'
  )
  on conflict (id) do update
  set status = excluded.status,
      valor = excluded.valor,
      vencimento = excluded.vencimento;

  -- ── 4. Debitar do Caixa apenas se for compra à vista ───────────────────
  if v_is_a_vista then
    insert into public.caixa_transacoes (
      filial_id,
      tipo,
      valor,
      categoria_id,
      descricao,
      entidade_id,
      entidade_tipo
    ) values (
      v_pedido.filial_id,
      'saida',
      v_pedido.total,
      'compra',
      'Compra à vista: ' || v_pedido.fornecedor_nome || ' — Pedido ' || substring(p_pedido_compra_id from 1 for 8),
      p_pedido_compra_id,
      'fornecedor'
    );
  end if;

  -- ── 5. Marcar pedido de compra como finalizado ─────────────────────────
  update public.pedidos_compra
  set status = 'finalizado',
      finalizado_em = now()
  where id = p_pedido_compra_id;

  return jsonb_build_object(
    'ok',                true,
    'pedido_id',         p_pedido_compra_id,
    'itens_processados', v_itens_processados,
    'caixa_debitado',    v_is_a_vista,
    'finalizado_em',     now()
  );

exception
  when others then
    raise exception using
      errcode = sqlstate,
      message = 'Erro ao finalizar pedido de compra: ' || sqlerrm;
end;
$$;

grant execute on function public.pedido_compra_finalizar_seguro(text) to authenticated;

comment on function public.pedido_compra_finalizar_seguro(text) is
  'Finaliza um pedido de compra de forma atômica e segura: registra as entradas no estoque (Kardex), '
  'atualiza o custo do produto, gera a conta a pagar e debita do caixa (se à vista).';

commit;
