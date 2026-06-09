-- 80_sugestao_compras_gerar_pedido.sql
-- Objetivo: RPC para gerar pedidos de compra em massa a partir das sugestões do Stock AI.
-- A função rpc_gerar_pedido_compra_sugestao() lê a view v_sugestao_compras
-- e cria um rascunho de pedido de compra para cada produto com status 'urgente' ou 'atencao'.
-- Idempotente: pode rodar múltiplas vezes com segurança.

begin;

create or replace function public.rpc_gerar_pedido_compra_sugestao(
  p_filial_id text,
  p_apenas_urgentes boolean default false
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_pedido_id   text;
  v_item        record;
  v_itens_total integer := 0;
  v_hoje        date := now()::date;
begin
  if not public.can_access_filial(p_filial_id) then
    raise exception using errcode = '42501', message = 'Sem acesso à filial.';
  end if;

  -- Gerar ID do novo pedido de compra
  v_pedido_id := 'PC-SUGESTAO-' || p_filial_id || '-' || to_char(now(), 'YYYYMMDD-HH24MISS');

  -- Criar o cabeçalho do pedido de compra
  insert into public.pedidos_compra (
    id,
    filial_id,
    fornecedor_id,
    fornecedor_nome,
    status,
    forma_pagamento,
    total,
    obs
  ) values (
    v_pedido_id,
    p_filial_id,
    null, -- Sem fornecedor específico (geração em massa)
    'Stock AI — Reposição Automática',
    'rascunho',
    'a_prazo',
    0,
    'Pedido gerado automaticamente pelo Stock AI com base no giro dos últimos 90 dias. Data: ' || to_char(now(), 'DD/MM/YYYY HH24:MI')
  );

  -- Inserir itens sugeridos (urgentes obrigatórios; atencao se não filtrado)
  for v_item in
    select produto_id, produto_nome, qtd_sugerida, consumo_diario_medio
    from public.v_sugestao_compras
    where (
      p_apenas_urgentes = false
        and status_reposicao in ('urgente', 'atencao')
      or
      p_apenas_urgentes = true
        and status_reposicao = 'urgente'
    )
    and qtd_sugerida > 0
  loop
    insert into public.pedido_compra_itens (
      pedido_compra_id,
      produto_id,
      nome,
      qty,
      custo_unitario
    )
    select
      v_pedido_id,
      v_item.produto_id,
      v_item.produto_nome,
      ceil(v_item.qtd_sugerida),
      coalesce(p.custo, 0)
    from public.produtos p
    where p.id = v_item.produto_id
    on conflict do nothing;

    v_itens_total := v_itens_total + 1;
  end loop;

  -- Atualizar total do pedido (soma dos custos × qtd)
  update public.pedidos_compra
  set total = (
    select coalesce(sum(qty * coalesce(custo_unitario, 0)), 0)
    from public.pedido_compra_itens
    where pedido_compra_id = v_pedido_id
  )
  where id = v_pedido_id;

  return jsonb_build_object(
    'ok',             true,
    'pedido_id',      v_pedido_id,
    'itens_gerados',  v_itens_total,
    'criado_em',      now()
  );
end;
$$;

grant execute on function public.rpc_gerar_pedido_compra_sugestao(text, boolean) to authenticated;

comment on function public.rpc_gerar_pedido_compra_sugestao(text, boolean) is
  'Gera um rascunho de pedido de compra em massa a partir das sugestões do Stock AI '
  '(view v_sugestao_compras). Inclui todos os produtos com status urgente e atencao '
  'por padrão, ou apenas urgentes se p_apenas_urgentes = true.';

commit;
