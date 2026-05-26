-- 52_pedidos_financeiro_e_estoque_sync.sql
-- Objetivo: Garantir consistência absoluta em vendas. Ao faturar/ativar um pedido:
--   1. Registra síncrona e automaticamente a saída de estoque no Kardex (movimentacoes).
--   2. Gera automaticamente a Conta a Receber (contas_receber).
--   3. Se a venda for à vista e concluída, realiza a baixa automática (contas_receber_baixas) que lança no caixa.
--   4. Se reaberto para orçamento, estorna estoque e remove registros financeiros correspondentes.
--   5. Limpa automaticamente lançamentos do caixa caso baixas financeiras sejam deletadas/estornadas.
-- Idempotente: pode rodar múltiplas vezes com segurança.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Atualizar fn_log_caixa_auto() para evitar duplo lançamento
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.fn_log_caixa_auto()
returns trigger as $$
declare
  v_categoria_id text;
  v_tipo text;
  v_valor numeric;
  v_descricao text;
  v_filial_id text;
  v_baixa_id text;
  v_entidade_id text;
  v_entidade_tipo text;
begin
  v_baixa_id := null;
  v_entidade_id := null;
  v_entidade_tipo := null;

  -- A. Tratar PEDIDOS (Venda à Vista)
  if (TG_TABLE_NAME = 'pedidos') then
    if (new.status in ('concluido', 'entregue_pago') and old.status <> new.status) then
      if (new.pgto in ('dinheiro', 'pix', 'cartao_debito', 'debito', 'avista')) then
        -- Evita duplo lançamento se já existir ou se for criada uma conta/baixa vinculada
        if exists (select 1 from public.contas_receber where pedido_id = new.id) then
          return new;
        end if;
        v_tipo := 'entrada';
        v_categoria_id := 'venda';
        v_valor := new.total;
        v_descricao := 'Venda à Vista: Pedido #' || new.num || ' (' || new.cli || ')';
        v_filial_id := new.filial_id;
        v_entidade_id := new.id;
        v_entidade_tipo := 'venda';
      else
        return new;
      end if;
    else
      return new;
    end if;
  end if;

  -- B. Tratar CONTAS_RECEBER_BAIXAS (Recebimento de Fiado/Prazo/À Vista)
  if (TG_TABLE_NAME = 'contas_receber_baixas') then
    if (TG_OP = 'INSERT') then
      v_tipo := 'entrada';
      v_categoria_id := 'recebimento';
      v_valor := new.valor;
      v_descricao := 'Recebimento: ' || (select cliente from public.contas_receber where id = new.conta_receber_id);
      v_filial_id := new.filial_id;
      v_baixa_id := new.id;
      v_entidade_id := new.conta_receber_id;
      v_entidade_tipo := 'recebimento';
    else
      return new;
    end if;
  end if;

  -- C. Tratar CONTAS_PAGAR (Pagamento de Fornecedor/Despesa)
  if (TG_TABLE_NAME = 'contas_pagar') then
    if (new.status = 'pago' and old.status <> 'pago') then
      v_tipo := 'saida';
      v_categoria_id := coalesce(new.categoria, 'compra');
      v_valor := new.valor;
      v_descricao := 'Pagamento: ' || new.fornecedor_nome || coalesce(' (' || new.obs || ')', '');
      v_filial_id := new.filial_id;
      v_entidade_id := new.id;
      v_entidade_tipo := 'compra';
    else
      return new;
    end if;
  end if;

  -- Inserir na tabela de transações
  if (v_valor > 0) then
    insert into public.caixa_transacoes (
      filial_id, tipo, valor, categoria_id, descricao, entidade_id, entidade_tipo, conta_receber_baixa_id
    ) values (
      v_filial_id, v_tipo, v_valor, v_categoria_id, v_descricao, 
      v_entidade_id, v_entidade_tipo, v_baixa_id
    );
  end if;

  return new;
end;
$$ language plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Criar trigger de exclusão de baixa financeira para reverter caixa
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.fn_caixa_auto_baixas_delete()
returns trigger
language plpgsql
security definer
as $$
begin
  delete from public.caixa_transacoes
  where conta_receber_baixa_id = old.id;
  return old;
end;
$$;

drop trigger if exists trg_caixa_auto_baixas_delete on public.contas_receber_baixas;
create trigger trg_caixa_auto_baixas_delete
after delete on public.contas_receber_baixas
for each row
execute function public.fn_caixa_auto_baixas_delete();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Criar função e trigger de sincronização de Pedidos (Estoque e Financeiro)
-- ─────────────────────────────────────────────────────────────────────────────
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
begin
  -- ── 1. SE O PEDIDO SE TORNOU ATIVO (KARDEX & CR) ──
  if (TG_OP = 'INSERT' and new.status not in ('orcamento', 'cancelado')) or
     (TG_OP = 'UPDATE' and old.status = 'orcamento' and new.status not in ('orcamento', 'cancelado')) then
     
    -- A. DEDUÇÃO DE ESTOQUE (SAÍDA NO KARDEX)
    -- Tenta ler da tabela pedido_itens (normalizada) primeiro
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

    -- Fallback para jsonb legado (itens) se não havia itens em pedido_itens
    if v_itens_ok = 0 and new.itens is not null then
      for v_item in
        select
          (elem ->> 'prodId')    as produto_id,
          (elem ->> 'qty')::numeric  as qty,
          (elem ->> 'custo')::numeric as custo,
          (elem ->> 'preco')::numeric as preco
        from jsonb_array_elements(new.itens) as elem
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
    
    -- Calcula vencimento com base no prazo
    v_vencimento := coalesce(new.data::date, now()::date);
    if new.prazo = '7d' then
      v_vencimento := v_vencimento + interval '7 days';
    elsif new.prazo = '15d' then
      v_vencimento := v_vencimento + interval '15 days';
    elsif new.prazo = '30d' then
      v_vencimento := v_vencimento + interval '30 days';
    elsif new.prazo = '60d' then
      v_vencimento := v_vencimento + interval '60 days';
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

  -- ── 2. SE FOR VENDAS À VISTA CONCLUÍDAS/ENTREGUES (BAIXA AUTOMÁTICA) ──
  if new.status in ('concluido', 'entregue_pago') and 
     new.pgto in ('dinheiro', 'pix', 'cartao_debito', 'debito', 'avista') then
     
    v_conta_id := 'REC-' || new.id;
    
    -- Garante que a conta existe (caso tenha sido inserida com outro status e agora concluída)
    if not exists (select 1 from public.contas_receber where id = v_conta_id) then
      v_vencimento := coalesce(new.data::date, now()::date);
      if new.prazo = '7d' then
        v_vencimento := v_vencimento + interval '7 days';
      elsif new.prazo = '15d' then
        v_vencimento := v_vencimento + interval '15 days';
      elsif new.prazo = '30d' then
        v_vencimento := v_vencimento + interval '30 days';
      elsif new.prazo = '60d' then
        v_vencimento := v_vencimento + interval '60 days';
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

    -- Executa a baixa automática do contas_receber
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

  -- ── 3. CASO DE RETORNO PARA ORÇAMENTO (REABERTURA DE PEDIDO) ──
  if (TG_OP = 'UPDATE' and old.status not in ('orcamento', 'cancelado') and new.status = 'orcamento') then
    -- Deleta as saídas do estoque (devolve ao estoque físico)
    delete from public.movimentacoes where id like 'MOV-SAIDA-PED-' || new.id || '-%';
    
    -- Deleta estornos de cancelamento se houver
    delete from public.movimentacoes where id like 'MOV-CANCEL-' || new.id || '-%';
    
    -- Deleta baixas financeiras vinculadas (automaticamente reverte lançamentos no caixa via trg_caixa_auto_baixas_delete)
    delete from public.contas_receber_baixas where pedido_id = new.id;
    
    -- Deleta a conta a receber
    delete from public.contas_receber where pedido_id = new.id;
  end if;

  return new;
end;
$$;

-- Aplicar o trigger na tabela public.pedidos
drop trigger if exists trg_pedidos_sync on public.pedidos;
create trigger trg_pedidos_sync
after insert or update on public.pedidos
for each row
execute function public.fn_pedidos_sync();

commit;
