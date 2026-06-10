-- 65_fix_contas_receber_cancelados.sql
-- Objetivo: Corrigir a função refresh_conta_receber_saldo para respeitar o status 'cancelado'.
-- Sincronizar contas_receber de pedidos que estão cancelados mas ficaram como 'pendente'.

begin;

-- 1. Atualizar a função refresh_conta_receber_saldo
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
        when c.status = 'cancelado' then 'cancelado'
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

-- 2. Sincronizar as contas_receber que ficaram órfãs (pedidos cancelados mas conta pendente)
update public.contas_receber cr
set status = 'cancelado',
    valor_em_aberto = 0,
    valor_recebido = 0,
    recebido_em = null,
    ultimo_recebimento_em = null
from public.pedidos p
where cr.pedido_id = p.id
  and p.status = 'cancelado'
  and cr.status != 'cancelado';

commit;
