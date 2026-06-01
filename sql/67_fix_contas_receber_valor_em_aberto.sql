-- 67_fix_contas_receber_valor_em_aberto.sql
-- Objetivo: Garantir que contas a receber tenham o saldo em aberto devidamente preenchido
-- e alinhar registros existentes que ficaram órfãos ou inconsistentes.

begin;

-- 1. Criar função de trigger para inicializar valores corretamente no INSERT/UPDATE
create or replace function public.fn_contas_receber_before_insert_or_update()
returns trigger as $$
declare
  v_total_recebido numeric := 0.00;
  v_ultima_baixa timestamptz;
begin
  -- Se for inserção de nova conta a receber
  if tg_op = 'INSERT' then
    -- Verifica se já há baixas existentes associadas a este ID (ex: inserções/migrações manuais)
    select coalesce(sum(b.valor), 0.00), max(b.recebido_em)
      into v_total_recebido, v_ultima_baixa
    from public.contas_receber_baixas b
    where b.conta_receber_id = new.id;

    new.valor_recebido := greatest(coalesce(v_total_recebido, 0.00), 0.00);
    
    -- Se o valor em aberto não foi definido ou veio como 0 para uma conta com valor pendente
    if new.valor_em_aberto is null or (new.valor_em_aberto = 0.00 and new.valor_recebido = 0.00) then
      new.valor_em_aberto := greatest(coalesce(new.valor, 0.00) - new.valor_recebido, 0.00);
    end if;

    -- Ajusta o status de forma consistente
    if new.status = 'cancelado' then
      -- mantém cancelado
    elsif new.valor_em_aberto <= 0.00 then
      new.status := 'recebido';
      new.recebido_em := coalesce(new.recebido_em, v_ultima_baixa, now());
    elsif new.valor_recebido > 0.00 then
      new.status := 'parcial';
      new.recebido_em := null;
    else
      new.status := 'pendente';
      new.recebido_em := null;
    end if;
    
    new.ultimo_recebimento_em := coalesce(new.ultimo_recebimento_em, v_ultima_baixa);

  -- Se for atualização de conta existente (ex: mudança do valor do pedido no faturamento)
  elsif tg_op = 'UPDATE' then
    if new.valor <> old.valor or new.valor_recebido <> old.valor_recebido then
      new.valor_em_aberto := greatest(coalesce(new.valor, 0.00) - coalesce(new.valor_recebido, 0.00), 0.00);
      
      -- Recalcula status com base no novo saldo em aberto
      if new.status = 'cancelado' then
        -- mantém cancelado
      elsif new.valor_em_aberto <= 0.00 then
        new.status := 'recebido';
        new.recebido_em := coalesce(new.recebido_em, old.recebido_em, now());
      elsif new.valor_recebido > 0.00 then
        new.status := 'parcial';
        new.recebido_em := null;
      else
        new.status := 'pendente';
        new.recebido_em := null;
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

-- 2. Criar trigger BEFORE INSERT OR UPDATE
drop trigger if exists trg_contas_receber_before_insert_or_update on public.contas_receber;
create trigger trg_contas_receber_before_insert_or_update
before insert or update on public.contas_receber
for each row
execute function public.fn_contas_receber_before_insert_or_update();

-- 3. Reconciliação em lote: Recalcular saldos de todas as contas a receber
do $$
declare
  r record;
begin
  for r in 
    select id from public.contas_receber
  loop
    perform public.refresh_conta_receber_saldo(r.id);
  end loop;
end;
$$;

commit;
