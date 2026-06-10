-- 82_expiracao_fidelidade.sql
-- Objetivo: Mecanismo automático para expirar pontos de fidelidade que não
-- foram resgatados após 12 meses (configurável) desde sua aquisição.
-- Inclui a RPC de processamento e a infraestrutura para rodar em lote.

begin;

create or replace function public.rpc_expirar_pontos_fidelidade(
  p_filial_id text default null,
  p_meses_expiracao integer default 12
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_cliente record;
  v_total_expirados numeric := 0;
  v_clientes_afetados integer := 0;
  v_data_corte timestamptz := now() - (p_meses_expiracao || ' months')::interval;
begin
  -- Esta função consolida o saldo disponível e verifica quais lançamentos de acúmulo
  -- são mais antigos que a data de corte. Como o resgate consome pontos numa lógica
  -- FIFO (First In First Out), nós apenas calculamos o saldo de pontos *vivos* mais velhos que a data de corte.

  -- Processar cliente a cliente para garantir atomicidade
  for v_cliente in
    select cf.cliente_id, cf.filial_id, cf.saldo_pontos
    from public.cliente_fidelidade_saldo cf
    where cf.saldo_pontos > 0
      and (p_filial_id is null or cf.filial_id = p_filial_id)
  loop
    declare
      v_pontos_acumulados_antigos numeric := 0;
      v_total_resgatado numeric := 0;
      v_pontos_a_expirar numeric := 0;
    begin
      -- 1. Quantos pontos foram ganhos ANTES da data de corte?
      select coalesce(sum(pontos), 0) into v_pontos_acumulados_antigos
      from public.cliente_fidelidade_lancamentos
      where cliente_id = v_cliente.cliente_id
        and tipo = 'acumulo'
        and status = 'efetivado'
        and criado_em <= v_data_corte;

      -- 2. Quantos pontos já foram consumidos na história (incluindo expirações passadas)?
      select coalesce(sum(abs(pontos)), 0) into v_total_resgatado
      from public.cliente_fidelidade_lancamentos
      where cliente_id = v_cliente.cliente_id
        and tipo in ('resgate', 'expiracao')
        and status = 'efetivado';

      -- 3. A expirar: o que foi ganho antes da data de corte, menos tudo que já foi consumido.
      -- Ex: ganhou 1000 pts há 2 anos, mas já consumiu 800. Faltam expirar 200.
      v_pontos_a_expirar := v_pontos_acumulados_antigos - v_total_resgatado;

      if v_pontos_a_expirar > 0 then
        -- Trava extra: não podemos expirar mais pontos do que o saldo atual do cliente
        if v_pontos_a_expirar > v_cliente.saldo_pontos then
          v_pontos_a_expirar := v_cliente.saldo_pontos;
        end if;

        -- Inserir o registro de expiração
        insert into public.cliente_fidelidade_lancamentos (
          cliente_id, filial_id, tipo, status, pontos, origem, observacao
        ) values (
          v_cliente.cliente_id,
          v_cliente.filial_id,
          'expiracao',
          'efetivado',
          -v_pontos_a_expirar,
          'sistema',
          'Expiração automática de pontos acumulados há mais de ' || p_meses_expiracao || ' meses.'
        );

        v_total_expirados := v_total_expirados + v_pontos_a_expirar;
        v_clientes_afetados := v_clientes_afetados + 1;
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'clientes_afetados', v_clientes_afetados,
    'pontos_expirados', v_total_expirados,
    'processado_em', now()
  );
end;
$$;

grant execute on function public.rpc_expirar_pontos_fidelidade(text, integer) to authenticated;

comment on function public.rpc_expirar_pontos_fidelidade(text, integer) is
  'Varre os saldos de fidelidade e expira os pontos acumulados há mais de X meses. '
  'Utiliza lógica FIFO para abater resgates do passivo mais antigo.';

commit;
