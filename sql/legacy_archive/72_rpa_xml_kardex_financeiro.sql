-- 72_rpa_xml_kardex_financeiro.sql
-- Objetivo: Criar RPCs para fechar o ciclo de importação de XML da Fase 2.2.
-- 1. Ingestão de Estoque e Atualização de Custo (Kardex).
-- 2. Provisão automática no Contas a Pagar e baixa no Caixa (se à vista).

begin;

-- =====================================================================================
-- 1. RPC: INGESTÃO TRANSACIONAL DE ESTOQUE (KARDEX)
-- =====================================================================================

create or replace function public.compra_importar_xml_estoque(
  p_pedido_compra_id text,
  p_filial_id text,
  p_itens jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_item jsonb;
  v_produto_id text;
  v_qty numeric;
  v_custo_unitario numeric;
  v_ipi numeric;
  v_frete numeric;
  v_impostos_recuperaveis numeric;
  
  v_custo_liquido_unitario numeric;
begin
  -- Exige json array
  if jsonb_typeof(p_itens) != 'array' then
    raise exception 'p_itens deve ser um array JSON válido.';
  end if;

  -- Loop em cada item importado
  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_produto_id := v_item->>'produto_id';
    v_qty := coalesce((v_item->>'qty')::numeric, 0);
    v_custo_unitario := coalesce((v_item->>'custo_unitario')::numeric, 0);
    v_ipi := coalesce((v_item->>'ipi')::numeric, 0);
    v_frete := coalesce((v_item->>'frete')::numeric, 0);
    v_impostos_recuperaveis := coalesce((v_item->>'impostos_recuperaveis')::numeric, 0);

    if v_produto_id is null or v_qty <= 0 then
      continue;
    end if;

    -- 1. Inserir no Kardex (movimentacoes)
    insert into public.movimentacoes (
      id, filial_id, produto_id, tipo, qty, obs, criado_por
    ) values (
      'MOV-ENTRADA-COMPRA-' || p_pedido_compra_id || '-' || v_produto_id || '-' || gen_random_uuid(),
      p_filial_id,
      v_produto_id,
      'entrada',
      v_qty,
      'Entrada por NF-e Fornecedor (' || p_pedido_compra_id || ')',
      auth.uid()
    );

    -- 2. Calcular Custo Líquido
    -- O IPI e o Frete aumentam o custo. Impostos Recuperáveis (ICMS se regime normal) diminuem.
    v_custo_liquido_unitario := v_custo_unitario + (v_ipi / v_qty) + (v_frete / v_qty) - (v_impostos_recuperaveis / v_qty);

    -- 3. Atualizar Cadastro do Produto (Custo Médio / Último Custo)
    -- Por simplicidade nesta fase, assume-se que o custo liquido atual substitui o custo base para próximas formações de preço.
    update public.produtos
    set custo = round(v_custo_liquido_unitario, 4)
    where id = v_produto_id and filial_id = p_filial_id;
    
  end loop;

end;
$$;

grant execute on function public.compra_importar_xml_estoque to authenticated;
comment on function public.compra_importar_xml_estoque is 'Consome um Array JSON de itens de compra, injeta no Kardex e recalcula o custo dos produtos.';

-- =====================================================================================
-- 2. RPC: ALIMENTAÇÃO FINANCEIRA AUTOMÁTICA (CONTAS A PAGAR & CAIXA)
-- =====================================================================================

create or replace function public.compra_importar_xml_financeiro(
  p_pedido_compra_id text,
  p_filial_id text,
  p_fornecedor_nome text,
  p_duplicatas jsonb,
  p_forma_pag_avista boolean default false
)
returns void
language plpgsql
security definer
as $$
declare
  v_dup jsonb;
  v_ndup text;
  v_dvenc date;
  v_vdup numeric;
  v_conta_id text;
begin
  if p_duplicatas is null or jsonb_typeof(p_duplicatas) != 'array' then
    return; -- Sem duplicatas, nada a fazer no financeiro
  end if;

  for v_dup in select * from jsonb_array_elements(p_duplicatas)
  loop
    v_ndup := v_dup->>'nDup';
    v_dvenc := (v_dup->>'dVenc')::date;
    v_vdup := (v_dup->>'vDup')::numeric;

    if v_vdup <= 0 then
      continue;
    end if;

    v_conta_id := 'CP-' || p_pedido_compra_id || '-' || coalesce(v_ndup, gen_random_uuid()::text);

    -- 1. Provisionar Contas a Pagar
    insert into public.contas_pagar (
      id, filial_id, pedido_compra_id, fornecedor_nome, valor, vencimento, status, categoria, obs
    ) values (
      v_conta_id,
      p_filial_id,
      p_pedido_compra_id,
      p_fornecedor_nome,
      v_vdup,
      v_dvenc,
      case when p_forma_pag_avista then 'pago' else 'pendente' end,
      'Mercadoria',
      'Importação NF-e Parcela: ' || coalesce(v_ndup, '1')
    )
    on conflict (id) do nothing;

    -- 2. Debitar direto do Caixa se for à vista
    if p_forma_pag_avista then
      update public.contas_pagar set pago_em = now() where id = v_conta_id;
      
      insert into public.caixa_transacoes (
        filial_id, tipo, valor, categoria_id, descricao, entidade_id, entidade_tipo, criado_por
      ) values (
        p_filial_id,
        'saida',
        v_vdup,
        'compra',
        'Pgto à vista Fornecedor: ' || p_fornecedor_nome,
        v_conta_id,
        'compra',
        auth.uid()
      );
    end if;

  end loop;

end;
$$;

grant execute on function public.compra_importar_xml_financeiro to authenticated;
comment on function public.compra_importar_xml_financeiro is 'Gera provisões de contas a pagar baseadas nas duplicatas do XML. Abate do caixa automaticamente se marcado como à vista.';

commit;
