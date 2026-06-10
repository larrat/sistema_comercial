-- 25_caixa_automacoes.sql
-- Gatilhos para automação de Fluxo de Caixa

begin;

-- Função genérica para registrar movimentação de caixa via Trigger
create or replace function public.fn_log_caixa_auto()
returns trigger as $$
declare
  v_categoria_id text;
  v_tipo text;
  v_valor numeric;
  v_descricao text;
  v_filial_id text;
begin
  -- 1. Tratar PEDIDOS (Venda à Vista)
  if (TG_TABLE_NAME = 'pedidos') then
    -- Somente se o status for finalizado (concluido/entregue) e NÃO for a prazo
    -- Nota: 'pgto' pode variar, ajustamos para os padrões conhecidos
    if (new.status in ('concluido', 'entregue_pago') and old.status <> new.status) then
      if (lower(coalesce(new.pgto, '')) in ('dinheiro', 'pix', 'cartao_debito', 'debito', 'avista', 'a_vista', 'cartao', 'cartao_credito', 'credito', 'misto')) then
        v_tipo := 'entrada';
        v_categoria_id := 'venda';
        v_valor := new.total;
        v_descricao := 'Venda à Vista: Pedido #' || new.num || ' (' || new.cli || ')';
        v_filial_id := new.filial_id;
      else
        return new; -- Venda a prazo será tratada na baixa do contas_receber
      end if;
    else
      return new;
    end if;
  end if;

  -- 2. Tratar CONTAS_RECEBER_BAIXAS (Recebimento de Fiado/Prazo)
  if (TG_TABLE_NAME = 'contas_receber_baixas') then
    if (TG_OP = 'INSERT') then
      v_tipo := 'entrada';
      v_categoria_id := 'recebimento';
      v_valor := new.valor;
      v_descricao := 'Recebimento: ' || (select cliente from public.contas_receber where id = new.conta_receber_id);
      v_filial_id := new.filial_id;
    else
      return new;
    end if;
  end if;

  -- 3. Tratar CONTAS_PAGAR (Pagamento de Fornecedor/Despesa)
  if (TG_TABLE_NAME = 'contas_pagar') then
    if (new.status = 'pago' and old.status <> 'pago') then
      v_tipo := 'saida';
      v_categoria_id := coalesce(new.categoria, 'compra');
      v_valor := new.valor;
      v_descricao := 'Pagamento: ' || new.fornecedor_nome || coalesce(' (' || new.obs || ')', '');
      v_filial_id := new.filial_id;
    else
      return new;
    end if;
  end if;

  -- Inserir na tabela de transações
  if (v_valor > 0) then
    insert into public.caixa_transacoes (
      filial_id, tipo, valor, categoria_id, descricao, entidade_id, entidade_tipo
    ) values (
      v_filial_id, v_tipo, v_valor, v_categoria_id, v_descricao, 
      case 
        when TG_TABLE_NAME = 'pedidos' then new.id 
        when TG_TABLE_NAME = 'contas_receber_baixas' then new.conta_receber_id
        when TG_TABLE_NAME = 'contas_pagar' then new.id
      end,
      case 
        when TG_TABLE_NAME = 'pedidos' then 'venda' 
        when TG_TABLE_NAME = 'contas_receber_baixas' then 'recebimento'
        when TG_TABLE_NAME = 'contas_pagar' then 'compra'
      end
    );
  end if;

  return new;
end;
$$ language plpgsql;

-- Aplicar Triggers
drop trigger if exists trg_caixa_auto_pedidos on public.pedidos;
create trigger trg_caixa_auto_pedidos
after update on public.pedidos
for each row execute function public.fn_log_caixa_auto();

drop trigger if exists trg_caixa_auto_baixas on public.contas_receber_baixas;
create trigger trg_caixa_auto_baixas
after insert on public.contas_receber_baixas
for each row execute function public.fn_log_caixa_auto();

drop trigger if exists trg_caixa_auto_pagar on public.contas_pagar;
create trigger trg_caixa_auto_pagar
after update on public.contas_pagar
for each row execute function public.fn_log_caixa_auto();

commit;
