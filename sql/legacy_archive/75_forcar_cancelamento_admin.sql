-- Script de diagnóstico e correção manual para o Pedido #14 (Ignorando RLS do Painel)

begin;

do $$
declare
  v_pedido_id text;
  v_filial_id text;
  v_count_cr int;
  v_count_cr_canc int;
begin
  -- 1. Encontra o ID do pedido #14
  select id, filial_id into v_pedido_id, v_filial_id
  from public.pedidos
  where num = 14
  limit 1;

  if v_pedido_id is null then
    raise notice 'Pedido #14 não encontrado na tabela pedidos!';
    return;
  end if;

  -- 2. Cancela Contas a Receber vinculadas
  -- Usamos o bypass na trigger de segurança recém-criada
  perform set_config('app.cr_skip_sync', '1', true);

  update public.contas_receber
  set status = 'cancelado',
      valor_recebido = 0,
      valor_em_aberto = 0
  where pedido_id = v_pedido_id;

  -- 3. Exclui baixas para não constar no caixa
  delete from public.contas_receber_baixas
  where conta_receber_id in (select id from public.contas_receber where pedido_id = v_pedido_id);

  -- 4. Reverte estoque
  insert into public.movimentacoes (
    id, filial_id, prod_id, "prodId", tipo, data, qty, custo, obs, ts
  )
  select 
    'MOV-CANCEL-ADMIN-' || v_pedido_id || '-' || pi.produto_id || '-' || extract(epoch from now())::bigint,
    v_filial_id,
    pi.produto_id,
    pi.produto_id,
    'entrada',
    now()::date,
    pi.qty,
    coalesce(pi.custo, pi.preco, 0),
    'Devolução forçada via admin (Pedido #14)',
    extract(epoch from now())::bigint
  from public.pedido_itens pi
  where pi.pedido_id = v_pedido_id
    and pi.produto_id is not null
    and pi.qty > 0
  on conflict (id) do nothing;

  -- 5. Atualiza o status do pedido
  update public.pedidos
  set status = 'cancelado',
      obs = coalesce(obs, '') || ' [CANCELADO: forçado pelo admin em ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || ']'
  where id = v_pedido_id;

  raise notice 'Pedido #14 cancelado com sucesso usando acesso Admin!';
end;
$$;

commit;
