-- 87_migracao_gerar_grade.sql
-- Objetivo: Reduzir tráfego de rede movendo a matriz combinatória de
-- Cores x Tamanhos (Grade) para dentro do banco de dados via CROSS JOIN.

begin;

create or replace function public.rpc_salvar_produto_grade(
  p_produto jsonb,
  p_cores jsonb default '[]'::jsonb,
  p_tamanhos jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_pai_id uuid;
  v_inserted integer := 0;
begin
  -- 1. Garante que o produto pai tem ID
  if p_produto->>'id' is null then
    p_produto := jsonb_set(p_produto, '{id}', to_jsonb(gen_random_uuid()));
  end if;
  
  v_pai_id := (p_produto->>'id')::uuid;

  -- 2. Insere (UPSERT) o Produto Pai
  insert into public.produtos
  select * from jsonb_populate_record(null::public.produtos, p_produto)
  on conflict (id) do update set
    nome = excluded.nome,
    sku = excluded.sku,
    cat = excluded.cat,
    un = excluded.un,
    custo = excluded.custo,
    pfa = excluded.pfa,
    ncm = excluded.ncm,
    cest = excluded.cest,
    updated_at = now();
    
  v_inserted := 1;

  -- 3. Se houver grade, gerar a matriz combinatória via CROSS JOIN
  if jsonb_array_length(p_cores) > 0 or jsonb_array_length(p_tamanhos) > 0 then
    
    with cores as (
      select nullif(x.value, '') as cor 
      from jsonb_array_elements_text(
        case when jsonb_array_length(p_cores) = 0 then '[""]'::jsonb else p_cores end
      ) x(value)
    ),
    tamanhos as (
      select nullif(y.value, '') as tamanho 
      from jsonb_array_elements_text(
        case when jsonb_array_length(p_tamanhos) = 0 then '[""]'::jsonb else p_tamanhos end
      ) y(value)
    ),
    grade as (
      select 
        c.cor, 
        t.tamanho
      from cores c cross join tamanhos t
      where c.cor is not null or t.tamanho is not null
    ),
    insercoes as (
      insert into public.produtos (
        id, filial_id, produto_pai_id, 
        nome, sku, tamanho,
        cat, un, custo, pfa, ncm, cest, esal
      )
      select 
        gen_random_uuid(),
        p_produto->>'filial_id',
        v_pai_id,
        concat_ws(' - ', p_produto->>'nome', g.cor, g.tamanho),
        concat_ws('-', coalesce(p_produto->>'sku', 'PROD'), upper(left(g.cor, 3)), g.tamanho),
        g.tamanho,
        p_produto->>'cat',
        p_produto->>'un',
        (p_produto->>'custo')::numeric,
        (p_produto->>'pfa')::numeric,
        p_produto->>'ncm',
        p_produto->>'cest',
        0 -- Variantes nascem com saldo zero
      from grade g
      returning id
    )
    select v_inserted + count(*) into v_inserted from insercoes;

  end if;

  return jsonb_build_object(
    'success', true,
    'pai_id', v_pai_id,
    'total_inseridos', v_inserted
  );
end;
$$;

grant execute on function public.rpc_salvar_produto_grade to authenticated;

comment on function public.rpc_salvar_produto_grade is 'Recebe um produto e listas de grade. Insere o pai e gera automaticamente as variantes usando CROSS JOIN no banco, economizando banda de rede.';

commit;
