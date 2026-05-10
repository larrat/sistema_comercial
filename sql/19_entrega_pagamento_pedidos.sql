-- 19_entrega_pagamento_pedidos.sql
-- Separa o evento de entrega do evento de pagamento sem remover status legados.
-- Idempotente: pode rodar mais de uma vez. Aplicar primeiro em homologacao.

begin;

alter table public.pedidos
  add column if not exists entregue_em timestamptz,
  add column if not exists entregue_por uuid references auth.users(id);

do $$
declare
  v_enum_type text;
  v_value text;
begin
  select t.typname
    into v_enum_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_type t on t.oid = a.atttypid
  where n.nspname = 'public'
    and c.relname = 'pedidos'
    and a.attname = 'status'
    and t.typtype = 'e'
  limit 1;

  if v_enum_type is not null then
    foreach v_value in array array[
      'entregue_aguardando_pagamento',
      'pago_aguardando_entrega',
      'concluido'
    ]
    loop
      execute format('alter type public.%I add value if not exists %L', v_enum_type, v_value);
    end loop;
  end if;
end;
$$;

alter table public.pedidos
  drop constraint if exists ck_pedidos_status;

alter table public.pedidos
  add constraint ck_pedidos_status
  check (
    status in (
      'orcamento',
      'confirmado',
      'em_separacao',
      'em_andamento',
      'entregue',
      'pago',
      'entregue_aguardando_pagamento',
      'pago_aguardando_entrega',
      'concluido',
      'cancelado'
    )
  );

create index if not exists ix_pedidos_filial_entregue_em
  on public.pedidos (filial_id, entregue_em)
  where entregue_em is not null;

create or replace function public.pedido_forma_pagamento_baixa_na_entrega(
  p_pgto text,
  p_prazo text
)
returns boolean
language sql
stable
as $$
  select
    lower(coalesce(p_pgto, '')) in ('a_vista', 'avista', 'pix', 'cartao', 'cartao_credito', 'cartao_debito', 'dinheiro')
    and lower(coalesce(p_prazo, '')) in ('', 'imediato', 'a_vista', 'avista', 'na_entrega');
$$;

create or replace function public.receber_apos_baixa_verificar_pedido(p_pedido_id text)
returns void
language plpgsql
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_saldo_aberto numeric := 0;
begin
  if p_pedido_id is null or trim(p_pedido_id) = '' then
    return;
  end if;

  select *
    into v_pedido
  from public.pedidos
  where id = p_pedido_id
  limit 1
  for update;

  if not found then
    return;
  end if;

  if coalesce(v_pedido.status, '') in ('cancelado', 'concluido') then
    return;
  end if;

  select coalesce(sum(greatest(coalesce(c.valor_em_aberto, coalesce(c.valor, 0) - coalesce(c.valor_recebido, 0)), 0)), 0)
    into v_saldo_aberto
  from public.contas_receber c
  where c.pedido_id = p_pedido_id;

  if v_saldo_aberto > 0.001 then
    return;
  end if;

  update public.pedidos p
  set status = case
        when p.entregue_em is not null then 'concluido'
        else 'pago_aguardando_entrega'
      end
  where p.id = p_pedido_id
    and coalesce(p.status, '') not in ('cancelado', 'concluido');
end;
$$;

create or replace function public.pedido_marcar_entregue(p_pedido_id text)
returns public.pedidos
language plpgsql
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_conta record;
  v_saldo_aberto numeric := 0;
  v_contas_count integer := 0;
  v_deve_baixar_na_entrega boolean := false;
begin
  if p_pedido_id is null or trim(p_pedido_id) = '' then
    raise exception using errcode = '23514', message = 'pedido_id obrigatorio';
  end if;

  select *
    into v_pedido
  from public.pedidos
  where id = p_pedido_id
  limit 1
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'pedido nao encontrado';
  end if;

  if not public.can_access_filial(v_pedido.filial_id) then
    raise exception using errcode = '42501', message = 'sem acesso a filial do pedido';
  end if;

  if coalesce(v_pedido.status, '') = 'cancelado' then
    raise exception using errcode = '23514', message = 'pedido cancelado nao pode ser entregue';
  end if;

  if coalesce(v_pedido.status, '') = 'concluido' then
    return v_pedido;
  end if;

  if coalesce(v_pedido.status, '') not in (
    'em_andamento',
    'orcamento',
    'confirmado',
    'em_separacao',
    'pago',
    'pago_aguardando_entrega',
    'entregue',
    'entregue_aguardando_pagamento'
  ) then
    raise exception using errcode = '23514', message = 'status atual nao permite confirmar entrega';
  end if;

  update public.pedidos
  set entregue_em = coalesce(entregue_em, now()),
      entregue_por = coalesce(entregue_por, auth.uid())
  where id = p_pedido_id
  returning * into v_pedido;

  v_deve_baixar_na_entrega := public.pedido_forma_pagamento_baixa_na_entrega(v_pedido.pgto, v_pedido.prazo);

  if v_deve_baixar_na_entrega then
    for v_conta in
      select c.*,
             greatest(coalesce(c.valor_em_aberto, coalesce(c.valor, 0) - coalesce(c.valor_recebido, 0)), 0) as saldo
      from public.contas_receber c
      where c.pedido_id = p_pedido_id
        and greatest(coalesce(c.valor_em_aberto, coalesce(c.valor, 0) - coalesce(c.valor_recebido, 0)), 0) > 0.001
      for update
    loop
      perform public.rpc_registrar_baixa(
        'entrega-auto-' || v_conta.id,
        v_conta.id,
        v_conta.saldo,
        now(),
        'Baixa automatica na confirmacao de entrega'
      );
    end loop;
  end if;

  select
    count(*),
    coalesce(sum(greatest(coalesce(c.valor_em_aberto, coalesce(c.valor, 0) - coalesce(c.valor_recebido, 0)), 0)), 0)
    into v_contas_count, v_saldo_aberto
  from public.contas_receber c
  where c.pedido_id = p_pedido_id;

  update public.pedidos
  set status = case
        when v_saldo_aberto <= 0.001 and (v_contas_count > 0 or v_deve_baixar_na_entrega) then 'concluido'
        else 'entregue_aguardando_pagamento'
      end
  where id = p_pedido_id
  returning * into v_pedido;

  return v_pedido;
end;
$$;

create or replace function public.sync_conta_receber_from_baixas()
returns trigger
language plpgsql
as $$
declare
  v_conta_id text;
  v_pedido_id text;
begin
  if current_setting('app.cr_skip_sync', true) = '1' then
    return coalesce(new, old);
  end if;

  v_conta_id := coalesce(new.conta_receber_id, old.conta_receber_id);

  perform public.refresh_conta_receber_saldo(v_conta_id);

  select c.pedido_id
    into v_pedido_id
  from public.contas_receber c
  where c.id = v_conta_id
  limit 1;

  perform public.receber_apos_baixa_verificar_pedido(v_pedido_id);

  return coalesce(new, old);
end;
$$;

grant execute on function public.pedido_forma_pagamento_baixa_na_entrega(text, text) to authenticated;
grant execute on function public.receber_apos_baixa_verificar_pedido(text) to authenticated;
grant execute on function public.pedido_marcar_entregue(text) to authenticated;

comment on column public.pedidos.entregue_em is
  'Timestamp da confirmacao operacional de entrega. Separado da baixa financeira.';
comment on column public.pedidos.entregue_por is
  'Usuario auth.uid() que confirmou a entrega operacional.';
comment on function public.pedido_marcar_entregue(text) is
  'Confirma entrega do pedido e decide status final conforme saldo financeiro em contas_receber.';
comment on function public.receber_apos_baixa_verificar_pedido(text) is
  'Apos baixa financeira, atualiza status do pedido se pagamento e entrega permitirem conclusao.';

commit;
