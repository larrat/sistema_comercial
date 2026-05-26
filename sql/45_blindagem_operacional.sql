-- 45_blindagem_operacional.sql
-- Objetivo: Blindagem operacional de ponta a ponta (conciliação automática de caixa e logística reversa de defeitos)
-- Idempotente: pode rodar mais de uma vez.

begin;

-- 1. Expansão de tabelas
-- Adicionar coluna de conciliação fina em transações de caixa
alter table if exists public.caixa_transacoes
  add column if not exists conta_receber_baixa_id text references public.contas_receber_baixas(id) on delete cascade;

create index if not exists ix_caixa_transacoes_baixa on public.caixa_transacoes (conta_receber_baixa_id);

-- Adicionar flag de defeito em itens devolvidos
alter table if exists public.devolucao_itens
  add column if not exists defeito boolean default false;

-- 2. Atualizar gatilho de Fluxo de Caixa (public.fn_log_caixa_auto)
create or replace function public.fn_log_caixa_auto()
returns trigger as $$
declare
  v_categoria_id text;
  v_tipo text;
  v_valor numeric;
  v_descricao text;
  v_filial_id text;
  v_baixa_id text;
begin
  v_baixa_id := null;

  -- A. Tratar PEDIDOS (Venda à Vista)
  if (TG_TABLE_NAME = 'pedidos') then
    if (new.status in ('concluido', 'entregue_pago') and old.status <> new.status) then
      if (new.pgto in ('dinheiro', 'pix', 'cartao_debito', 'debito', 'avista')) then
        v_tipo := 'entrada';
        v_categoria_id := 'venda';
        v_valor := new.total;
        v_descricao := 'Venda à Vista: Pedido #' || new.num || ' (' || new.cli || ')';
        v_filial_id := new.filial_id;
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
      case 
        when TG_TABLE_NAME = 'pedidos' then new.id 
        when TG_TABLE_NAME = 'contas_receber_baixas' then new.conta_receber_id
        when TG_TABLE_NAME = 'contas_pagar' then new.id
      end,
      case 
        when TG_TABLE_NAME = 'pedidos' then 'venda' 
        when TG_TABLE_NAME = 'contas_receber_baixas' then 'recebimento'
        when TG_TABLE_NAME = 'contas_pagar' then 'compra'
      end,
      v_baixa_id
    );
  end if;

  return new;
end;
$$ language plpgsql;

-- 3. Gatilho de Logística Reversa: Devolução com Defeito ➔ Avaria e Baixa Automática
create or replace function public.fn_log_avaria_devolucao_defeito()
returns trigger as $$
declare
  v_custo_un numeric;
  v_filial_id text;
  v_avaria_id uuid;
begin
  -- Obter filial_id do registro pai (devolucoes)
  select filial_id into v_filial_id from public.devolucoes where id = new.devolucao_id;
  -- Obter custo unitário do produto
  select custo into v_custo_un from public.produtos where id = new.produto_id and filial_id = v_filial_id;
  
  v_avaria_id := gen_random_uuid();
  v_custo_un := coalesce(v_custo_un, new.valor_unitario, 0);

  -- A. Registrar Avaria para controle de auditoria de descarte
  insert into public.avarias (
    id,
    filial_id,
    produto_id,
    quantidade,
    custo_unitario,
    valor_custo_perda,
    motivo,
    destino,
    observacoes,
    criado_em
  ) values (
    v_avaria_id,
    v_filial_id,
    new.produto_id,
    new.quantidade,
    v_custo_un,
    new.quantidade * v_custo_un,
    'defeito_fabrica',
    'descarte',
    'Logística Reversa Automática: Item defeituoso retornado pelo cliente.',
    now()
  );

  -- B. Registrar saída de estoque justificada (Kardex)
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
    'MOV-AV-DEV-' || v_avaria_id,
    v_filial_id,
    new.produto_id,
    new.produto_id,
    'saida',
    now()::date,
    new.quantidade,
    v_custo_un,
    'Logística Reversa: Item defeituoso devolvido - Registrado como descarte por avaria.',
    extract(epoch from now())::bigint
  );

  return new;
end;
$$ language plpgsql;

-- Aplicar o gatilho na tabela public.devolucao_itens
drop trigger if exists trg_devolucao_defeito_avaria on public.devolucao_itens;
create trigger trg_devolucao_defeito_avaria
after insert on public.devolucao_itens
for each row
when (new.defeito = true)
execute function public.fn_log_avaria_devolucao_defeito();

commit;
