-- 84_migracao_pdv_salvar_pedido.sql
-- Objetivo: Mover o N+1 de cálculo de impostos do frontend para o backend.
-- A RPC recebe o payload do pedido inteiro, calcula os tributos item a item em memória,
-- insere o pedido na tabela principal e faz o dual-write na tabela normalizada pedido_itens.

begin;

create or replace function public.rpc_salvar_pedido_pdv(
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_filial_id text;
  v_cliente_id text;
  v_itens jsonb;
  v_item jsonb;
  v_item_enriquecido jsonb;
  v_itens_finais jsonb := '[]'::jsonb;
  v_tributos jsonb;
  v_pedido_id text;
  v_novo_num integer;
  v_saved_pedido record;
begin
  -- Extrair dados base
  v_filial_id := p_payload->>'filial_id';
  v_cliente_id := p_payload->>'cliente_id';
  v_itens := p_payload->'itens';

  -- Determinar NUM se não existir ou for nulo/0
  if p_payload->>'num' is null or (p_payload->>'num')::numeric <= 0 then
    select coalesce(max(num), 0) + 1 into v_novo_num
    from public.pedidos
    where filial_id = v_filial_id;
    
    p_payload := jsonb_set(p_payload, '{num}', to_jsonb(v_novo_num));
  end if;

  -- Se ID for gerado pelo front, ou criar novo
  if p_payload->>'id' is null then
    p_payload := jsonb_set(p_payload, '{id}', to_jsonb(gen_random_uuid()::text));
  end if;
  
  v_pedido_id := p_payload->>'id';

  -- Loop pelos itens para enriquecer com impostos (N+1 interno ultra rápido)
  if jsonb_typeof(v_itens) = 'array' then
    for v_item in select * from jsonb_array_elements(v_itens)
    loop
      -- Chamar motor tributário
      v_tributos := public.calcular_tributos_item(
        p_filial_id := v_filial_id,
        p_cliente_id := v_cliente_id,
        p_produto_id := v_item->>'prodId',
        p_qty := coalesce((v_item->>'qty')::numeric, 1),
        p_preco_unitario := coalesce((v_item->>'preco')::numeric, 0),
        p_tipo_operacao := 'venda'
      );
      
      -- Embutir tributos no item
      v_item_enriquecido := jsonb_set(v_item, '{tributos}', coalesce(v_tributos, '{}'::jsonb));
      v_itens_finais := v_itens_finais || v_item_enriquecido;
    end loop;
  end if;

  -- Substituir itens antigos pelos enriquecidos
  p_payload := jsonb_set(p_payload, '{itens}', v_itens_finais);
  -- Garantir defaults
  if p_payload->>'venda_fechada' is null then
    p_payload := jsonb_set(p_payload, '{venda_fechada}', 'false'::jsonb);
  end if;

  -- UPSERT na tabela agregada (pedidos)
  insert into public.pedidos
  select * from jsonb_populate_record(null::public.pedidos, p_payload)
  on conflict (id) do update set
    num = excluded.num,
    cliente_id = excluded.cliente_id,
    data = excluded.data,
    total = excluded.total,
    status = excluded.status,
    itens = excluded.itens,
    origem_venda = excluded.origem_venda,
    rca_id = excluded.rca_id,
    rca_nome = excluded.rca_nome,
    pgto = excluded.pgto,
    obs = excluded.obs
  returning * into v_saved_pedido;

  -- FASE 5: DUAL-WRITE em pedido_itens
  -- Apagar itens antigos (se houver) para recriar
  delete from public.pedido_itens where pedido_id = v_pedido_id;

  if jsonb_typeof(v_itens_finais) = 'array' then
    for v_item in select * from jsonb_array_elements(v_itens_finais)
    loop
      insert into public.pedido_itens (
        id,
        pedido_id,
        filial_id,
        produto_id,
        linha,
        nome,
        un,
        qty,
        preco,
        custo,
        item
      ) values (
        v_pedido_id || ':' || coalesce((v_item->>'linha')::text, '1'),
        v_pedido_id,
        v_filial_id,
        v_item->>'prodId',
        coalesce((v_item->>'linha')::integer, 1),
        coalesce(v_item->>'nome', ''),
        coalesce(v_item->>'un', 'un'),
        coalesce((v_item->>'qty')::numeric, 1),
        coalesce((v_item->>'preco')::numeric, 0),
        coalesce((v_item->>'custo')::numeric, 0),
        v_item
      );
    end loop;
  end if;

  return to_jsonb(v_saved_pedido);
end;
$$;

grant execute on function public.rpc_salvar_pedido_pdv to authenticated;

comment on function public.rpc_salvar_pedido_pdv is 'Salva o pedido de venda, executa o motor tributário nativamente (N+1 rápido) e propaga para a tabela legada e normalizada em transação atômica.';

commit;
