-- 53_fix_trigger_itens_cast.sql
-- Objetivo: Corrigir o erro "cannot extract elements from a scalar" no trigger fn_pedidos_sync.
-- Causa: a coluna pedidos.itens é do tipo TEXT, não JSONB. O jsonb_array_elements precisava
--        de um cast explícito e seguro para JSONB antes de operar.
-- Solução: substituir jsonb_array_elements(new.itens) por
--          jsonb_array_elements(public.safe_pedido_itens_jsonb(new.itens))
--          que já existe no banco (migration 18) e trata NULLs e não-arrays com segurança.
-- Idempotente: pode rodar múltiplas vezes com segurança.

begin;

create or replace function public.fn_pedidos_sync()
returns trigger
language plpgsql
security definer
as $$
declare
  v_item record;
  v_mov_id text;
  v_conta_id text;
  v_vencimento date;
  v_itens_ok integer := 0;
  v_itens_jsonb jsonb;
begin
  -- ── 0. CASO DE EXCLUSÃO DO PEDIDO (DELETE) ──
  if (TG_OP = 'DELETE') then
    delete from public.movimentacoes where id like 'MOV-SAIDA-PED-' || old.id || '-%';
    delete from public.movimentacoes where id like 'MOV-CANCEL-' || old.id || '-%';
    delete from public.contas_receber_baixas where pedido_id = old.id;
    delete from public.contas_receber where pedido_id = old.id;
    return old;
  end if;

  -- ── 1. SE O PEDIDO SE TORNOU ATIVO (KARDEX & CR) ──
  if (TG_OP = 'INSERT' and new.status not in ('orcamento', 'cancelado')) or
     (TG_OP = 'UPDATE' and old.status = 'orcamento' and new.status not in ('orcamento', 'cancelado')) then

    -- A. DEDUÇÃO DE ESTOQUE (SAÍDA NO KARDEX)
    -- Prioridade 1: tabela normalizada pedido_itens
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
        v_mov_id,
        new.filial_id,
        v_item.produto_id,
        v_item.produto_id,
        'saida',
        coalesce(new.data::date, now()::date),
        v_item.qty,
        coalesce(v_item.custo, v_item.preco, 0),
        'Saída automática por faturamento do Pedido #' || coalesce(new.num::text, new.id),
        extract(epoch from now())::bigint
      )
      on conflict (id) do nothing;
      v_itens_ok := v_itens_ok + 1;
    end loop;

    -- Prioridade 2: fallback para itens legados (coluna TEXT → cast seguro para JSONB)
    if v_itens_ok = 0 and new.itens is not null then
      v_itens_jsonb := public.safe_pedido_itens_jsonb(new.itens);
      for v_item in
        select
          (elem ->> 'prodId')            as produto_id,
          (elem ->> 'qty')::numeric      as qty,
          (elem ->> 'custo')::numeric    as custo,
          (elem ->> 'preco')::numeric    as preco
        from jsonb_array_elements(v_itens_jsonb) as elem
        where (elem ->> 'prodId') is not null
          and (elem ->> 'qty')::numeric > 0
      loop
        v_mov_id := 'MOV-SAIDA-PED-' || new.id || '-' || v_item.produto_id;
        insert into public.movimentacoes (
          id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
        ) values (
          v_mov_id,
          new.filial_id,
          v_item.produto_id,
          v_item.produto_id,
          'saida',
          coalesce(new.data::date, now()::date),
          v_item.qty,
          coalesce(v_item.custo, v_item.preco, 0),
          'Saída automática por faturamento do Pedido #' || coalesce(new.num::text, new.id),
          extract(epoch from now())::bigint
        )
        on conflict (id) do nothing;
      end loop;
    end if;

    -- B. FINANCEIRO: GERAR CONTAS A RECEBER
    v_conta_id := 'REC-' || new.id;
    v_vencimento := coalesce(new.data::date, now()::date);
    if new.prazo = '7d'  then v_vencimento := v_vencimento + interval '7 days';
    elsif new.prazo = '15d' then v_vencimento := v_vencimento + interval '15 days';
    elsif new.prazo = '30d' then v_vencimento := v_vencimento + interval '30 days';
    elsif new.prazo = '60d' then v_vencimento := v_vencimento + interval '60 days';
    end if;

    insert into public.contas_receber (
      id, filial_id, pedido_id, pedido_num, cliente_id, cliente, valor, vencimento, status, obs
    ) values (
      v_conta_id,
      new.filial_id,
      new.id,
      new.num,
      new.cliente_id,
      new.cli,
      new.total,
      v_vencimento,
      'pendente',
      'Gerado automaticamente para o Pedido #' || new.num
    )
    on conflict (id) do nothing;
  end if;

  -- ── 2. SE O PEDIDO JÁ ERA ATIVO E FOI MODIFICADO ──
  if (TG_OP = 'UPDATE' and
      old.status not in ('orcamento', 'cancelado') and
      new.status not in ('orcamento', 'cancelado')) then

    -- A. Atualiza metadados financeiros
    if (coalesce(new.total,0) <> coalesce(old.total,0) or
        coalesce(new.cli,'') <> coalesce(old.cli,'') or
        coalesce(new.prazo,'') <> coalesce(old.prazo,'') or
        coalesce(new.cliente_id,'') <> coalesce(old.cliente_id,'')) then
      v_conta_id := 'REC-' || new.id;
      v_vencimento := coalesce(new.data::date, now()::date);
      if new.prazo = '7d'  then v_vencimento := v_vencimento + interval '7 days';
      elsif new.prazo = '15d' then v_vencimento := v_vencimento + interval '15 days';
      elsif new.prazo = '30d' then v_vencimento := v_vencimento + interval '30 days';
      elsif new.prazo = '60d' then v_vencimento := v_vencimento + interval '60 days';
      end if;
      update public.contas_receber
      set valor = new.total,
          cliente = new.cli,
          cliente_id = new.cliente_id,
          vencimento = v_vencimento
      where id = v_conta_id;
      perform public.refresh_conta_receber_saldo(v_conta_id);
    end if;

    -- B. Sincroniza estoque se os itens mudaram (comparação segura em TEXT)
    if (coalesce(new.itens,'') <> coalesce(old.itens,'')) then
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
          v_mov_id, new.filial_id, v_item.produto_id, v_item.produto_id,
          'saida', coalesce(new.data::date, now()::date),
          v_item.qty, coalesce(v_item.custo, v_item.preco, 0),
          'Saída automática por faturamento do Pedido #' || coalesce(new.num::text, new.id),
          extract(epoch from now())::bigint
        )
        on conflict (id) do nothing;
        v_itens_ok := v_itens_ok + 1;
      end loop;

      if v_itens_ok = 0 and new.itens is not null then
        v_itens_jsonb := public.safe_pedido_itens_jsonb(new.itens);
        for v_item in
          select
            (elem ->> 'prodId')            as produto_id,
            (elem ->> 'qty')::numeric      as qty,
            (elem ->> 'custo')::numeric    as custo,
            (elem ->> 'preco')::numeric    as preco
          from jsonb_array_elements(v_itens_jsonb) as elem
          where (elem ->> 'prodId') is not null
            and (elem ->> 'qty')::numeric > 0
        loop
          v_mov_id := 'MOV-SAIDA-PED-' || new.id || '-' || v_item.produto_id;
          insert into public.movimentacoes (
            id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
          ) values (
            v_mov_id, new.filial_id, v_item.produto_id, v_item.produto_id,
            'saida', coalesce(new.data::date, now()::date),
            v_item.qty, coalesce(v_item.custo, v_item.preco, 0),
            'Saída automática por faturamento do Pedido #' || coalesce(new.num::text, new.id),
            extract(epoch from now())::bigint
          )
          on conflict (id) do nothing;
        end loop;
      end if;
    end if;
  end if;

  -- ── 3. SE FOR VENDA À VISTA CONCLUÍDA (BAIXA AUTOMÁTICA NO CAIXA) ──
  if new.status in ('concluido', 'entregue_pago') and
     new.pgto in ('dinheiro', 'pix', 'cartao_debito', 'debito', 'avista', 'a_vista') then

    v_conta_id := 'REC-' || new.id;

    -- Garante que a conta existe
    if not exists (select 1 from public.contas_receber where id = v_conta_id) then
      v_vencimento := coalesce(new.data::date, now()::date);
      insert into public.contas_receber (
        id, filial_id, pedido_id, pedido_num, cliente_id, cliente, valor, vencimento, status, obs
      ) values (
        v_conta_id, new.filial_id, new.id, new.num, new.cliente_id, new.cli,
        new.total, v_vencimento, 'pendente',
        'Gerado automaticamente para o Pedido #' || new.num
      )
      on conflict (id) do nothing;
    end if;

    -- Baixa automática (dispara trg_caixa_auto_baixas → caixa_transacoes)
    insert into public.contas_receber_baixas (
      id, filial_id, conta_receber_id, pedido_id, pedido_num, cliente_id, cliente, valor, recebido_em, observacao
    ) values (
      'BAIXA-AUTO-' || new.id,
      new.filial_id,
      v_conta_id,
      new.id,
      new.num,
      new.cliente_id,
      new.cli,
      new.total,
      now(),
      'Baixa automática para Venda à Vista'
    )
    on conflict (id) do nothing;
  end if;

  -- ── 4. CASO DE RETORNO PARA ORÇAMENTO (REABERTURA) ──
  if (TG_OP = 'UPDATE' and old.status not in ('orcamento', 'cancelado') and new.status = 'orcamento') then
    delete from public.movimentacoes where id like 'MOV-SAIDA-PED-' || new.id || '-%';
    delete from public.movimentacoes where id like 'MOV-CANCEL-' || new.id || '-%';
    delete from public.contas_receber_baixas where pedido_id = new.id;
    delete from public.contas_receber where pedido_id = new.id;
  end if;

  -- ── 5. CASO DE CANCELAMENTO DIRETO ──
  if (TG_OP = 'UPDATE' and old.status not in ('orcamento', 'cancelado') and new.status = 'cancelado') then
    perform set_config('app.cr_skip_sync', '1', true);
    delete from public.contas_receber_baixas where pedido_id = new.id;
    perform set_config('app.cr_skip_sync', '0', true);

    update public.contas_receber
    set status = 'cancelado',
        valor_recebido = 0,
        valor_em_aberto = 0,
        recebido_em = null,
        ultimo_recebimento_em = null
    where pedido_id = new.id;

    -- Devolve estoque
    v_itens_ok := 0;
    for v_item in
      select pi.produto_id, pi.qty, pi.custo, pi.preco
      from public.pedido_itens pi
      where pi.pedido_id = new.id
        and pi.filial_id = new.filial_id
        and pi.produto_id is not null
        and pi.qty > 0
    loop
      v_mov_id := 'MOV-CANCEL-' || new.id || '-' || v_item.produto_id || '-' || extract(epoch from now())::bigint;
      insert into public.movimentacoes (
        id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
      ) values (
        v_mov_id, new.filial_id, v_item.produto_id, v_item.produto_id,
        'entrada', now()::date,
        v_item.qty, coalesce(v_item.custo, v_item.preco, 0),
        'Devolução automática por cancelamento do Pedido #' || coalesce(new.num::text, new.id),
        extract(epoch from now())::bigint
      )
      on conflict (id) do nothing;
      v_itens_ok := v_itens_ok + 1;
    end loop;

    if v_itens_ok = 0 and new.itens is not null then
      v_itens_jsonb := public.safe_pedido_itens_jsonb(new.itens);
      for v_item in
        select
          (elem ->> 'prodId')            as produto_id,
          (elem ->> 'qty')::numeric      as qty,
          (elem ->> 'custo')::numeric    as custo,
          (elem ->> 'preco')::numeric    as preco
        from jsonb_array_elements(v_itens_jsonb) as elem
        where (elem ->> 'prodId') is not null
          and (elem ->> 'qty')::numeric > 0
      loop
        v_mov_id := 'MOV-CANCEL-' || new.id || '-' || v_item.produto_id || '-' || extract(epoch from now())::bigint;
        insert into public.movimentacoes (
          id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
        ) values (
          v_mov_id, new.filial_id, v_item.produto_id, v_item.produto_id,
          'entrada', now()::date,
          v_item.qty, coalesce(v_item.custo, v_item.preco, 0),
          'Devolução automática por cancelamento do Pedido #' || coalesce(new.num::text, new.id),
          extract(epoch from now())::bigint
        )
        on conflict (id) do nothing;
      end loop;
    end if;
  end if;

  return new;
end;
$$;

-- Re-aplica o trigger (sem mudança de assinatura)
drop trigger if exists trg_pedidos_sync on public.pedidos;
create trigger trg_pedidos_sync
after insert or update or delete on public.pedidos
for each row
execute function public.fn_pedidos_sync();

commit;
