-- 49_correcoes_processos.sql
-- Objetivo: Corrigir 4 lacunas identificadas na análise de processos:
--   1. RPC de cancelamento seguro de Pedido de Compra (reverter estoque + conta a pagar)
--   2. View get_saldo_caixa para evitar leitura de todas as transações no cliente
--   3. Coluna vencimento em vale_trocas
--   4. Política INSERT em nfe_destinadas
-- Idempotente: pode rodar mais de uma vez.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RPC: pedido_compra_cancelar_seguro
--    Cancela um pedido de compra finalizado de forma atômica:
--    - Reverte as entradas de estoque (Kardex)
--    - Cancela a conta a pagar associada
--    - Marca o pedido como 'cancelado'
-- ─────────────────────────────────────────────────────────────────────────────
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

  -- ── 1. Verificações de segurança ─────────────────────────────────────────
  if not public.can_access_filial(v_pedido.filial_id) then
    raise exception using
      errcode = '42501',
      message = 'Sem permissão para acessar a filial deste pedido de compra.';
  end if;

  if coalesce(v_pedido.status, '') = 'cancelado' then
    -- Idempotente: já cancelado
    return jsonb_build_object(
      'ok',           true,
      'ja_cancelado', true,
      'pedido_id',    p_pedido_compra_id
    );
  end if;

  if coalesce(v_pedido.status, '') = 'aberto' then
    -- Pedido aberto (não finalizado): apenas cancela, sem reverter estoque
    update public.pedidos_compra
    set status = 'cancelado'
    where id = p_pedido_compra_id;

    return jsonb_build_object(
      'ok',                    true,
      'pedido_id',             p_pedido_compra_id,
      'itens_revertidos',      0,
      'conta_pagar_cancelada', false,
      'observacao',            'Pedido estava aberto — sem estoque a reverter.'
    );
  end if;

  -- ── 2. Reverter entradas de estoque no Kardex (apenas se finalizado) ─────
  for v_item in
    select produto_id, qty, custo_unitario
    from public.pedido_compra_itens
    where pedido_compra_id = p_pedido_compra_id
      and produto_id is not null
      and qty > 0
  loop
    v_mov_id := 'MOV-COMPRA-CANCEL-' || p_pedido_compra_id || '-' || v_item.produto_id
                || '-' || extract(epoch from now())::bigint;

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
      'saida',
      now()::date,
      v_item.qty,
      coalesce(v_item.custo_unitario, 0),
      'Saída automática por cancelamento do Pedido de Compra ' || p_pedido_compra_id,
      extract(epoch from now())::bigint
    )
    on conflict (id) do nothing;

    v_itens_revertidos := v_itens_revertidos + 1;
  end loop;

  -- ── 3. Cancelar a conta a pagar associada ────────────────────────────────
  update public.contas_pagar
  set status = 'cancelado'
  where pedido_compra_id = p_pedido_compra_id
    and status in ('pendente', 'pago');

  get diagnostics v_conta_cancelada = row_count;

  -- ── 4. Marcar pedido de compra como cancelado ────────────────────────────
  update public.pedidos_compra
  set status = 'cancelado'
  where id = p_pedido_compra_id;

  return jsonb_build_object(
    'ok',                    true,
    'pedido_id',             p_pedido_compra_id,
    'itens_revertidos',      v_itens_revertidos,
    'conta_pagar_cancelada', v_conta_cancelada,
    'cancelado_em',          now()
  );

exception
  when others then
    raise exception using
      errcode = sqlstate,
      message = 'Erro ao cancelar pedido de compra: ' || sqlerrm;
end;
$$;

grant execute on function public.pedido_compra_cancelar_seguro(text, text) to authenticated;

comment on function public.pedido_compra_cancelar_seguro(text, text) is
  'Cancela um pedido de compra de forma atômica: reverte entradas de estoque no Kardex, '
  'cancela a conta a pagar associada e marca o pedido como cancelado. Idempotente.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. View: get_saldo_caixa — evita carregar todas as transações no cliente
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view public.vw_saldo_caixa as
select
  filial_id,
  coalesce(
    sum(case when tipo = 'entrada' then valor else -valor end),
    0
  ) as saldo
from public.caixa_transacoes
group by filial_id;

-- RLS: a view herda a segurança da tabela base (caixa_transacoes tem RLS ativo)
-- Grant para leitura via REST API
grant select on public.vw_saldo_caixa to authenticated;

comment on view public.vw_saldo_caixa is
  'Saldo atual de caixa por filial. Calculado no banco — evita trazer todas as transações ao cliente.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Coluna vencimento em vale_trocas (vale-troca não pode ser eterno)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.vale_trocas
  add column if not exists vencimento date;

-- Backfill: vales existentes vencem em 1 ano a partir da criação
update public.vale_trocas
set vencimento = (criado_em + interval '1 year')::date
where vencimento is null;

comment on column public.vale_trocas.vencimento is
  'Data de expiração do vale-troca. Null = sem expiração (legado). Vales novos devem ter vencimento.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Política INSERT em nfe_destinadas (necessária para importação real SEFAZ)
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Membros da filial podem inserir notas destinadas" on public.nfe_destinadas;
create policy "Membros da filial podem inserir notas destinadas"
  on public.nfe_destinadas
  for insert
  to authenticated
  with check (
    filial_id in (
      select filial_id
      from public.user_filiais
      where user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Adicionar status 'cancelado' em contas_pagar (se não existir)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.contas_pagar
  drop constraint if exists ck_contas_pagar_status;

alter table public.contas_pagar
  add constraint ck_contas_pagar_status
  check (status in ('pendente', 'pago', 'cancelado'));

commit;
