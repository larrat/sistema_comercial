-- 47_correcao_gatilho_caixa.sql
-- Objetivo: Corrigir o gatilho public.fn_log_caixa_auto() para evitar o erro de compilação dinâmica do Postgres 'record "new" has no field "conta_receber_id"'.
-- Idempotente: pode rodar mais de uma vez.

begin;

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
      if (lower(coalesce(new.pgto, '')) in ('dinheiro', 'pix', 'cartao_debito', 'debito', 'avista', 'a_vista', 'cartao', 'cartao_credito', 'credito', 'misto')) then
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

  -- B. Tratar CONTAS_RECEBER_BAIXAS (Recebimento de Fiado/Prazo)
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

commit;
