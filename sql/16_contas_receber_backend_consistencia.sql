-- 16_contas_receber_backend_consistencia.sql
-- Centraliza a consistencia financeira de contas a receber no banco.

begin;

update public.contas_receber
set status = 'pendente'
where status = 'vencido';

alter table public.contas_receber
  drop constraint if exists ck_contas_receber_status;

alter table public.contas_receber
  add constraint ck_contas_receber_status
  check (status in ('pendente', 'parcial', 'recebido'));

create or replace function public.refresh_conta_receber_saldo(p_conta_receber_id text)
returns void
language plpgsql
as $$
declare
  v_total_recebido numeric := 0;
  v_ultima_baixa timestamptz;
begin
  if p_conta_receber_id is null or trim(p_conta_receber_id) = '' then
    return;
  end if;

  select
    coalesce(sum(b.valor), 0),
    max(b.recebido_em)
    into v_total_recebido, v_ultima_baixa
  from public.contas_receber_baixas b
  where b.conta_receber_id = p_conta_receber_id;

  update public.contas_receber c
  set valor_recebido = greatest(coalesce(v_total_recebido, 0), 0),
      valor_em_aberto = greatest(coalesce(c.valor, 0) - coalesce(v_total_recebido, 0), 0),
      status = case
        when greatest(coalesce(c.valor, 0) - coalesce(v_total_recebido, 0), 0) <= 0 then 'recebido'
        when coalesce(v_total_recebido, 0) > 0 then 'parcial'
        else 'pendente'
      end,
      recebido_em = case
        when greatest(coalesce(c.valor, 0) - coalesce(v_total_recebido, 0), 0) <= 0 then v_ultima_baixa
        else null
      end,
      ultimo_recebimento_em = v_ultima_baixa
  where c.id = p_conta_receber_id;
end;
$$;

create or replace function public.enforce_conta_receber_baixa()
returns trigger
language plpgsql
as $$
declare
  v_conta public.contas_receber%rowtype;
  v_total_existente numeric := 0;
begin
  if new.conta_receber_id is null or trim(new.conta_receber_id) = '' then
    raise exception using errcode = '23514', message = 'conta_receber_id obrigatorio';
  end if;

  if new.valor is null or new.valor <= 0 then
    raise exception using errcode = '23514', message = 'valor da baixa deve ser maior que zero';
  end if;

  select *
    into v_conta
  from public.contas_receber
  where id = new.conta_receber_id
  limit 1
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'conta a receber nao encontrada';
  end if;

  if not public.can_access_filial(v_conta.filial_id) then
    raise exception using errcode = '42501', message = 'sem acesso a filial da conta';
  end if;

  if coalesce(v_conta.valor_em_aberto, greatest(coalesce(v_conta.valor, 0) - coalesce(v_conta.valor_recebido, 0), 0)) <= 0 then
    raise exception using errcode = '23514', message = 'conta ja quitada nao aceita nova baixa';
  end if;

  select coalesce(sum(b.valor), 0)
    into v_total_existente
  from public.contas_receber_baixas b
  where b.conta_receber_id = new.conta_receber_id
    and b.id <> coalesce(new.id, '');

  if v_total_existente + new.valor > coalesce(v_conta.valor, 0) + 0.001 then
    raise exception using errcode = '23514', message = 'a baixa nao pode ultrapassar o valor da conta';
  end if;

  new.filial_id := v_conta.filial_id;
  new.pedido_id := v_conta.pedido_id;
  new.pedido_num := v_conta.pedido_num;
  new.cliente_id := v_conta.cliente_id;
  new.cliente := v_conta.cliente;
  new.recebido_em := coalesce(new.recebido_em, now());

  return new;
end;
$$;

create or replace function public.sync_conta_receber_from_baixas()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_conta_receber_saldo(coalesce(new.conta_receber_id, old.conta_receber_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_conta_receber_baixa_guard on public.contas_receber_baixas;
create trigger trg_conta_receber_baixa_guard
before insert or update on public.contas_receber_baixas
for each row
execute function public.enforce_conta_receber_baixa();

drop trigger if exists trg_conta_receber_baixa_sync on public.contas_receber_baixas;
create trigger trg_conta_receber_baixa_sync
after insert or update or delete on public.contas_receber_baixas
for each row
execute function public.sync_conta_receber_from_baixas();

update public.contas_receber
set valor_recebido = 0,
    valor_em_aberto = coalesce(valor, 0),
    status = 'pendente',
    recebido_em = null,
    ultimo_recebimento_em = null
where true;

do $$
declare
  r record;
begin
  for r in
    select id
    from public.contas_receber
  loop
    perform public.refresh_conta_receber_saldo(r.id);
  end loop;
end;
$$;

create or replace function public.rpc_registrar_baixa(
  p_baixa_id text,
  p_conta_receber_id text,
  p_valor numeric,
  p_recebido_em timestamptz default now(),
  p_observacao text default null
)
returns public.contas_receber
language plpgsql
as $$
declare
  v_result public.contas_receber%rowtype;
begin
  if p_baixa_id is null or trim(p_baixa_id) = '' then
    raise exception using errcode = '23514', message = 'id da baixa obrigatorio';
  end if;

  insert into public.contas_receber_baixas (
    id,
    filial_id,
    conta_receber_id,
    pedido_id,
    pedido_num,
    cliente_id,
    cliente,
    valor,
    recebido_em,
    observacao
  )
  values (
    p_baixa_id,
    '',
    p_conta_receber_id,
    null,
    null,
    null,
    '',
    p_valor,
    p_recebido_em,
    p_observacao
  );

  select *
    into v_result
  from public.contas_receber
  where id = p_conta_receber_id
  limit 1;

  return v_result;
end;
$$;

create or replace function public.rpc_estornar_baixa(
  p_baixa_id text
)
returns public.contas_receber
language plpgsql
as $$
declare
  v_conta_id text;
  v_result public.contas_receber%rowtype;
begin
  delete from public.contas_receber_baixas
  where id = p_baixa_id
  returning conta_receber_id into v_conta_id;

  if v_conta_id is null then
    raise exception using errcode = 'P0002', message = 'baixa nao encontrada';
  end if;

  select *
    into v_result
  from public.contas_receber
  where id = v_conta_id
  limit 1;

  return v_result;
end;
$$;

create or replace function public.rpc_marcar_conta_pendente(
  p_conta_receber_id text
)
returns public.contas_receber
language plpgsql
as $$
declare
  v_result public.contas_receber%rowtype;
begin
  delete from public.contas_receber_baixas
  where conta_receber_id = p_conta_receber_id;

  perform public.refresh_conta_receber_saldo(p_conta_receber_id);

  select *
    into v_result
  from public.contas_receber
  where id = p_conta_receber_id
  limit 1;

  return v_result;
end;
$$;

grant execute on function public.rpc_registrar_baixa(text, text, numeric, timestamptz, text) to authenticated;
grant execute on function public.rpc_estornar_baixa(text) to authenticated;
grant execute on function public.rpc_marcar_conta_pendente(text) to authenticated;

commit;
