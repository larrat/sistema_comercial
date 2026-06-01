-- ==============================================================================
-- 73_limpeza_pedidos_cancelados.sql
-- Propósito: 
-- 1. Redefinir pedido_cancelar_seguro para usar variável de ambiente no escopo inteiro.
-- 2. Limpar (cancelar de fato) pedidos que constam como concluídos/abertos
--    mas que tiveram todas as suas contas a receber canceladas indevidamente.
-- 3. Adicionar uma trava de segurança (trigger) no Contas a Receber para 
--    impedir que um usuário cancele o financeiro isoladamente se houver um 
--    pedido vinculado.
-- ==============================================================================

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ATUALIZAR FUNÇÃO pedido_cancelar_seguro
-- Mantendo a configuração skip_sync='1' durante toda a operação de CR.
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

  -- Sinalizamos que estamos num cancelamento de pedido para as triggers do financeiro
  perform set_config('app.cr_skip_sync', '1', true);

  -- ── 2. Estornar todas as baixas e cancelar contas_receber ─────────────────
  for v_conta in
    select c.id, c.valor_em_aberto, c.valor_recebido, c.filial_id
    from public.contas_receber c
    where c.pedido_id = p_pedido_id
    for update
  loop
    -- 2a. Remover todas as baixas
    delete from public.contas_receber_baixas
    where conta_receber_id = v_conta.id;

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

  -- Restaura a flag
  perform set_config('app.cr_skip_sync', '0', true);

  -- ── 3. Devolver estoque dos itens ao Kardex ────────────────────────────────
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
      id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
    ) values (
      v_mov_id, v_pedido.filial_id, v_item.produto_id, v_item.produto_id, 'entrada', now()::date, v_item.qty, coalesce(v_item.custo, v_item.preco, 0),
      'Devolução automática por cancelamento do Pedido #' || coalesce(v_pedido.num::text, p_pedido_id), extract(epoch from now())::bigint
    )
    on conflict (id) do nothing;
    v_itens_ok := v_itens_ok + 1;
  end loop;

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
        id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
      ) values (
        v_mov_id, v_pedido.filial_id, v_item.produto_id, v_item.produto_id, 'entrada', now()::date, v_item.qty, coalesce(v_item.custo, v_item.preco, 0),
        'Devolução automática por cancelamento do Pedido #' || coalesce(v_pedido.num::text, p_pedido_id), extract(epoch from now())::bigint
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
    -- Garante que se houver erro a flag volta a 0 pra não impactar a sessão
    perform set_config('app.cr_skip_sync', '0', true);
    raise exception using
      errcode = sqlstate,
      message = 'Erro ao cancelar pedido: ' || sqlerrm;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CORREÇÃO DE DADOS (LIMPEZA)
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_pedido record;
  v_count integer := 0;
begin
  for v_pedido in (
    select p.id
    from public.pedidos p
    join public.contas_receber c on c.pedido_id = p.id
    where coalesce(p.status, '') <> 'cancelado'
    group by p.id
    having count(*) = sum(case when c.status = 'cancelado' then 1 else 0 end)
  )
  loop
    perform public.pedido_cancelar_seguro(v_pedido.id, 'Cancelamento automático: contas a receber já haviam sido canceladas');
    v_count := v_count + 1;
  end loop;
  raise notice 'Limpeza concluída. Total de pedidos cancelados automaticamente: %', v_count;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. AJUSTE DE LÓGICA (TRAVA DE SEGURANÇA)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.trg_block_cancel_contas_receber()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'cancelado' and old.status is distinct from 'cancelado' then
    if new.pedido_id is not null then
      -- Se for '1', é a nossa função interna de cancelar pedido rodando. Tudo certo.
      if current_setting('app.cr_skip_sync', true) = '1' then
        return new;
      end if;

      raise exception 'Operação não permitida. Esta conta a receber está vinculada a um Pedido de Venda. Cancele o Pedido Inteiro (que reverte o estoque) em vez de cancelar apenas o recebimento.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_block_cancel_cr on public.contas_receber;
create trigger trg_block_cancel_cr
before update on public.contas_receber
for each row
execute function public.trg_block_cancel_contas_receber();

commit;
