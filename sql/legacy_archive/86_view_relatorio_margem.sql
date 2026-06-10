-- 86_view_relatorio_margem.sql
-- Objetivo: Mover cálculos de margem (lucro, markup, curva) do JS para o Banco de Dados.
-- A RPC retorna os indicadores gerais e os top produtos baseados na ordenação escolhida.

begin;

create or replace function public.rpc_relatorio_margem(
  p_filial_id text,
  p_sort_by text default 'margem', -- 'margem', 'lucro', 'estoque'
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_totais jsonb;
  v_produtos jsonb;
begin
  -- 1. Calcular totais gerais do portfólio
  select jsonb_build_object(
    'custoTotal', coalesce(sum(custo_imobilizado), 0),
    'vgvTotal', coalesce(sum(potencial_venda), 0),
    'lucroTotal', coalesce(sum(potencial_lucro), 0),
    'margemMedia', case 
      when sum(potencial_venda) > 0 then (sum(potencial_lucro) / sum(potencial_venda)) * 100 
      else 0 
    end,
    'produtosComMargemNegativa', count(*) filter (where margem_percentual < 0),
    'itensAnalisados', count(*)
  ) into v_totais
  from (
    select 
      coalesce(esal, 0) as estoque_real,
      coalesce(pfa, 0) as preco,
      coalesce(ecm, custo, 0) as custo_real,
      (coalesce(ecm, custo, 0) * greatest(coalesce(esal, 0), 0)) as custo_imobilizado,
      (coalesce(pfa, 0) * greatest(coalesce(esal, 0), 0)) as potencial_venda,
      ((coalesce(pfa, 0) - coalesce(ecm, custo, 0)) * greatest(coalesce(esal, 0), 0)) as potencial_lucro,
      case 
        when coalesce(pfa, 0) > 0 then ((coalesce(pfa, 0) - coalesce(ecm, custo, 0)) / coalesce(pfa, 0)) * 100
        else 0
      end as margem_percentual
    from public.produtos
    where filial_id = p_filial_id
      and coalesce(pfa, 0) > 0 
      and coalesce(ecm, custo, 0) > 0
  ) t;

  -- 2. Trazer a listagem de produtos ordenada
  with base_produtos as (
    select 
      id,
      nome,
      sku,
      codigo_barras,
      un,
      coalesce(esal, 0) as esal,
      coalesce(ecm, custo, 0) as custo,
      coalesce(pfa, 0) as preco,
      (coalesce(pfa, 0) - coalesce(ecm, custo, 0)) as lucroLiquido,
      case 
        when coalesce(pfa, 0) > 0 then ((coalesce(pfa, 0) - coalesce(ecm, custo, 0)) / coalesce(pfa, 0)) * 100
        else 0
      end as margem,
      ((coalesce(pfa, 0) - coalesce(ecm, custo, 0)) * greatest(coalesce(esal, 0), 0)) as potencialLucro
    from public.produtos
    where filial_id = p_filial_id
      and coalesce(pfa, 0) > 0 
      and coalesce(ecm, custo, 0) > 0
  )
  select coalesce(jsonb_agg(row_to_json(bp)), '[]'::jsonb) into v_produtos
  from (
    select * from base_produtos
    order by
      case when p_sort_by = 'margem' then margem end desc,
      case when p_sort_by = 'lucro' then lucroLiquido end desc,
      case when p_sort_by = 'estoque' then esal end desc
    limit p_limit
  ) bp;

  -- Retorna o conjunto completo
  return jsonb_build_object(
    'totais', v_totais,
    'produtos', v_produtos
  );
end;
$$;

grant execute on function public.rpc_relatorio_margem to authenticated;

comment on function public.rpc_relatorio_margem is 'Processa o relatório de margem e curva de lucro diretamente no banco de dados, evitando download em massa para o cliente.';

commit;
