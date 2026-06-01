-- Script de diagnóstico e correção manual para o Pedido #14

begin;

do $$
declare
  v_pedido_id text;
  v_count_cr int;
  v_count_cr_canc int;
begin
  -- 1. Encontra o ID do pedido #14
  select id into v_pedido_id
  from public.pedidos
  where num = 14
  limit 1;

  if v_pedido_id is null then
    raise notice 'Pedido #14 não encontrado na tabela pedidos!';
    return;
  end if;

  -- 2. Verifica a situação do contas_receber para esse pedido
  select count(*),
         sum(case when status = 'cancelado' then 1 else 0 end)
  into v_count_cr, v_count_cr_canc
  from public.contas_receber
  where pedido_id = v_pedido_id;

  raise notice 'Pedido % (ID: %)', 14, v_pedido_id;
  raise notice 'Total de CRs vinculados: %', v_count_cr;
  raise notice 'Total de CRs com status cancelado: %', v_count_cr_canc;

  -- 3. Força o cancelamento seguro se ele ainda não estiver cancelado
  -- Isso ignora se o CR está ou não cancelado, apenas força o cancelamento do pedido e reverte o estoque.
  perform public.pedido_cancelar_seguro(v_pedido_id, 'Cancelamento forçado pelo admin (Correção #14)');

  raise notice 'Pedido #14 cancelado com sucesso e estoque revertido.';
end;
$$;

commit;
