-- 79_regua_cobranca_automatizada.sql
-- Objetivo: Implementar automação real da Régua de Cobrança.
-- 1. Tabela de log de cobranças enviadas (cobranca_log)
-- 2. RPC public.rpc_processar_regua_cobranca() — cruza contas_receber vencidas/próximas com as regras da régua
-- 3. RPC public.rpc_marcar_contas_vencidas() — atualiza status de contas_receber pendentes que já venceram
-- Idempotente: pode rodar múltiplas vezes com segurança.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Adicionar status 'vencido' no constraint de contas_receber
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.contas_receber
  drop constraint if exists ck_contas_receber_status;

alter table public.contas_receber
  add constraint ck_contas_receber_status
  check (status in ('pendente', 'parcial', 'recebido', 'cancelado', 'vencido'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Tabela de histórico de cobranças (cobranca_log)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.cobranca_log (
  id            text primary key default 'COBR-' || gen_random_uuid()::text,
  filial_id     text not null references public.filiais(id) on delete cascade,
  conta_id      text not null references public.contas_receber(id) on delete cascade,
  cliente_id    text null references public.clientes(id) on delete set null,
  cliente       text not null,
  regua_id      text not null references public.regua_cobranca_config(id) on delete cascade,
  tipo_evento   text not null, -- 'vencimento_proximo', 'vencimento_hoje', 'atraso'
  canal         text not null default 'whatsapp',
  destino       text null,       -- número do WhatsApp ou email
  mensagem      text not null,
  status        text not null default 'pendente', -- 'pendente', 'enviado', 'erro'
  enviado_em    timestamptz null,
  erro          text null,
  data_ref      date not null default current_date, -- usado para idempotência diária no índice
  criado_em     timestamptz not null default now()
);

create index if not exists ix_cobranca_log_filial_criado
  on public.cobranca_log (filial_id, criado_em desc);

create index if not exists ix_cobranca_log_conta
  on public.cobranca_log (conta_id);

-- Unique por (conta + regra + dia) usando coluna date pura (não expressão, sem problema de IMMUTABLE)
create unique index if not exists ux_cobranca_log_daily
  on public.cobranca_log (conta_id, regua_id, data_ref);

alter table public.cobranca_log enable row level security;

do $$ begin
  create policy p_cobranca_log_all on public.cobranca_log
    for all to authenticated
    using (public.can_access_filial(filial_id))
    with check (public.can_access_filial(filial_id));
exception when duplicate_object then null;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RPC: Marcar contas pendentes/parciais como 'vencido' (roda diariamente)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.rpc_marcar_contas_vencidas(
  p_filial_id text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_total integer := 0;
begin
  update public.contas_receber
  set status = 'vencido'
  where status in ('pendente', 'parcial')
    and vencimento < now()::date
    and (p_filial_id is null or filial_id = p_filial_id);

  get diagnostics v_total = row_count;

  return jsonb_build_object(
    'ok',              true,
    'contas_vencidas', v_total,
    'processado_em',   now()
  );
end;
$$;

grant execute on function public.rpc_marcar_contas_vencidas(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RPC: Processar Régua de Cobrança (gera registros de cobranca_log)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.rpc_processar_regua_cobranca(
  p_filial_id text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_regra       record;
  v_conta       record;
  v_cliente     record;
  v_msg         text;
  v_destino     text;
  v_tipo_evento text;
  v_criados     integer := 0;
  v_ignorados   integer := 0;
  v_hoje        date := now()::date;
begin
  if not public.can_access_filial(p_filial_id) then
    raise exception using errcode = '42501', message = 'Sem acesso à filial.';
  end if;

  -- Primeiro: atualizar status de vencidas
  perform public.rpc_marcar_contas_vencidas(p_filial_id);

  -- Iterar por cada regra ativa da filial
  for v_regra in
    select * from public.regua_cobranca_config
    where filial_id = p_filial_id and ativo = true
    order by dias_offset
  loop
    -- Determinar tipo de evento a partir do offset
    if v_regra.dias_offset < 0 then
      v_tipo_evento := 'vencimento_proximo';
    elsif v_regra.dias_offset = 0 then
      v_tipo_evento := 'vencimento_hoje';
    else
      v_tipo_evento := 'atraso';
    end if;

    -- Buscar contas que se encaixam nesta régua
    for v_conta in
      select cr.*
      from public.contas_receber cr
      where cr.filial_id = p_filial_id
        and cr.status in ('pendente', 'parcial', 'vencido')
        and cr.vencimento = (v_hoje + (v_regra.dias_offset || ' days')::interval)::date
    loop
      -- Buscar dados de contato do cliente
      select tel, whatsapp, email, nome
        into v_cliente
      from public.clientes
      where id = v_conta.cliente_id
      limit 1;

      -- Determinar destino conforme canal
      if v_regra.canal = 'whatsapp' then
        v_destino := coalesce(v_cliente.whatsapp, v_cliente.tel);
      else
        v_destino := v_cliente.email;
      end if;

      -- Montar mensagem substituindo variáveis do template
      v_msg := v_regra.template;
      v_msg := replace(v_msg, '{{cliente}}', coalesce(v_conta.cliente, ''));
      v_msg := replace(v_msg, '{{valor}}', 'R$ ' || to_char(coalesce(v_conta.valor_em_aberto, v_conta.valor), 'FM999G999G990D00'));
      v_msg := replace(v_msg, '{{vencimento}}', to_char(v_conta.vencimento, 'DD/MM/YYYY'));
      v_msg := replace(v_msg, '{{dias_atraso}}', abs(v_regra.dias_offset)::text);

      -- Inserir no log (unique constraint protege contra duplicatas no dia)
      begin
        insert into public.cobranca_log (
          filial_id, conta_id, cliente_id, cliente,
          regua_id, tipo_evento, canal, destino,
          mensagem, status
        ) values (
          p_filial_id,
          v_conta.id,
          v_conta.cliente_id,
          v_conta.cliente,
          v_regra.id,
          v_tipo_evento,
          v_regra.canal,
          v_destino,
          v_msg,
          'pendente'
        );
        v_criados := v_criados + 1;
      exception
        when unique_violation then
          v_ignorados := v_ignorados + 1;
      end;
    end loop;
  end loop;

  return jsonb_build_object(
    'ok',          true,
    'criados',     v_criados,
    'ignorados',   v_ignorados,
    'processado_em', now()
  );
end;
$$;

grant execute on function public.rpc_processar_regua_cobranca(text) to authenticated;

comment on function public.rpc_processar_regua_cobranca(text) is
  'Processa a régua de cobrança da filial: cruza contas a receber abertas '
  'com as regras configuradas em regua_cobranca_config e gera registros em '
  'cobranca_log para posterior envio via WhatsApp ou email. Idempotente no mesmo dia.';

commit;
