-- 48_cancelamento_seguro_pedido.sql
-- Objetivo: Implementar cancelamento seguro e atômico de pedidos.
-- Garante que ao cancelar um pedido:
--   1. Todas as contas_receber vinculadas são marcadas como canceladas.
--   2. Todas as baixas parciais (contas_receber_baixas) são estornadas.
--   3. O estoque dos itens é devolvido ao Kardex (movimentação de entrada).
--   4. Toda a operação é atômica (ou tudo funciona ou nada muda).
-- Idempotente: pode rodar mais de uma vez.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Adicionar status 'cancelado' em contas_receber (se constraint existir)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.contas_receber
  drop constraint if exists ck_contas_receber_status;

alter table public.contas_receber
  add constraint ck_contas_receber_status
  check (status in ('pendente', 'parcial', 'recebido', 'cancelado'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Função principal: pedido_cancelar_seguro
-- ─────────────────────────────────────────────────────────────────────────────
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
  -- ── 0. Carregar e travar o pedido ──────────────────────────────────────────
  select *
    into v_pedido
  from public.pedidos
  where id = p_pedido_id
  limit 1
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Pedido não encontrado: ' || coalesce(p_pedido_id, '(null)');
  end if;

  -- ── 1. Verificações de segurança ───────────────────────────────────────────
  if not public.can_access_filial(v_pedido.filial_id) then
    raise exception using
      errcode = '42501',
      message = 'Sem permissão para acessar a filial deste pedido.';
  end if;

  if coalesce(v_pedido.status, '') = 'cancelado' then
    -- Idempotente: já cancelado, retorna sem erro
    return jsonb_build_object(
      'ok',             true,
      'ja_cancelado',   true,
      'pedido_id',      p_pedido_id
    );
  end if;

  if v_pedido.fiscal_status = 'emitido' then
    raise exception using
      errcode = '23514',
      message = 'Não é possível cancelar um pedido com Nota Fiscal emitida na SEFAZ. Cancele ou dê baixa na NF-e primeiro.';
  end if;

  -- ── 2. Estornar todas as baixas e cancelar contas_receber ─────────────────
  for v_conta in
    select c.id, c.valor_em_aberto, c.valor_recebido, c.filial_id
    from public.contas_receber c
    where c.pedido_id = p_pedido_id
    for update
  loop
    -- 2a. Remover todas as baixas (usando skip_sync para fazer apenas uma
    --     atualização de saldo no final)
    perform set_config('app.cr_skip_sync', '1', true);

    delete from public.contas_receber_baixas
    where conta_receber_id = v_conta.id;

    perform set_config('app.cr_skip_sync', '0', true);

    -- 2b. Marcar conta como cancelada diretamente
    update public.contas_receber
    set status           = 'cancelado',
        valor_recebido   = 0,
        valor_em_aberto  = 0,
        recebido_em      = null,
        ultimo_recebimento_em = null
    where id = v_conta.id;

    v_contas_cancel := v_contas_cancel + 1;
  end loop;

  -- ── 3. Devolver estoque dos itens ao Kardex ────────────────────────────────
  -- Tenta ler da tabela pedido_itens (normalizada) primeiro
  for v_item in
    select pi.produto_id, pi.qty, pi.custo, pi.preco
    from public.pedido_itens pi
    where pi.pedido_id = p_pedido_id
      and pi.filial_id = v_pedido.filial_id
      and pi.produto_id is not null
      and pi.qty > 0
  loop
    v_mov_id := 'MOV-CANCEL-' || p_pedido_id || '-' || v_item.produto_id || '-' || extract(epoch from now())::bigint;

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
      now()::date,
      v_item.qty,
      coalesce(v_item.custo, v_item.preco, 0),
      'Devolução automática por cancelamento do Pedido #' || coalesce(v_pedido.num::text, p_pedido_id),
      extract(epoch from now())::bigint
    )
    on conflict (id) do nothing;

    v_itens_ok := v_itens_ok + 1;
  end loop;

  -- Se não havia itens em pedido_itens, tenta no jsonb legado (coluna itens)
  if v_itens_ok = 0 and v_pedido.itens is not null then
    for v_item in
      select
        (elem ->> 'prodId')    as produto_id,
        (elem ->> 'qty')::numeric  as qty,
        (elem ->> 'custo')::numeric as custo,
        (elem ->> 'preco')::numeric as preco
      from jsonb_array_elements(v_pedido.itens) as elem
      where (elem ->> 'prodId') is not null
        and (elem ->> 'qty')::numeric > 0
    loop
      v_mov_id := 'MOV-CANCEL-' || p_pedido_id || '-' || v_item.produto_id || '-' || extract(epoch from now())::bigint;

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
        now()::date,
        v_item.qty,
        coalesce(v_item.custo, v_item.preco, 0),
        'Devolução automática por cancelamento do Pedido #' || coalesce(v_pedido.num::text, p_pedido_id),
        extract(epoch from now())::bigint
      )
      on conflict (id) do nothing;

      v_itens_ok := v_itens_ok + 1;
    end loop;
  end if;

  -- ── 4. Marcar pedido como cancelado ───────────────────────────────────────
  update public.pedidos
  set status     = 'cancelado',
      obs        = coalesce(obs, '') || case
                     when coalesce(obs, '') <> '' then ' | '
                     else ''
                   end || '[CANCELADO: ' || p_motivo || ' em ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || ']'
  where id = p_pedido_id
  returning * into v_pedido;

  -- ── 5. Resultado ───────────────────────────────────────────────────────────
  return jsonb_build_object(
    'ok',               true,
    'pedido_id',        p_pedido_id,
    'pedido_num',       v_pedido.num,
    'contas_canceladas', v_contas_cancel,
    'itens_estoque_revertidos', v_itens_ok,
    'cancelado_em',     now()
  );

exception
  when others then
    raise exception using
      errcode = sqlstate,
      message = 'Erro ao cancelar pedido: ' || sqlerrm;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Permissões
-- ─────────────────────────────────────────────────────────────────────────────
grant execute on function public.pedido_cancelar_seguro(text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Documentação
-- ─────────────────────────────────────────────────────────────────────────────
comment on function public.pedido_cancelar_seguro(text, text) is
  'Cancela um pedido de forma atômica e segura: estorna baixas financeiras, '
  'cancela contas_receber vinculadas e devolve o estoque dos itens ao Kardex. '
  'Rejeita pedidos com NF-e emitida. Idempotente para pedidos já cancelados.';

commit;
