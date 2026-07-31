DROP VIEW IF EXISTS public.v_sugestao_compras CASCADE;

CREATE OR REPLACE VIEW public.v_sugestao_compras AS
WITH vendas_recentes AS (
    SELECT 
        item.produto_id,
        SUM(item.qty) as total_vendido,
        COUNT(DISTINCT p.id) as num_pedidos
    FROM public.pedido_itens item
    JOIN public.pedidos p ON p.id = item.pedido_id
    WHERE p.criado_em >= (NOW() - INTERVAL '90 days')
      AND p.status = 'finalizado'
    GROUP BY item.produto_id
),
calculos AS (
    SELECT 
        p.id as produto_id,
        p.nome as produto_nome,
        p.sku,
        p.esal as estoque_atual,
        p.emin as estoque_minimo,
        COALESCE(v.total_vendido, 0) / 90.0 as consumo_diario_medio,
        CASE 
            WHEN COALESCE(v.total_vendido, 0) > 0 THEN p.esal / (v.total_vendido / 90.0)
            ELSE 999 
        END as dias_cobertura,
        p.genero, 
        p.cat     
    FROM public.produtos p
    LEFT JOIN vendas_recentes v ON v.produto_id = p.id
)
SELECT 
    produto_id,
    produto_nome,
    sku,
    estoque_atual,
    estoque_minimo,
    consumo_diario_medio,
    dias_cobertura,
    CASE 
        WHEN estoque_atual <= estoque_minimo OR dias_cobertura <= 7 THEN 'urgente'
        WHEN dias_cobertura <= 15 THEN 'atencao'
        ELSE 'ok'
    END as status_reposicao,
    CASE 
        WHEN estoque_atual <= estoque_minimo THEN 
            GREATEST(estoque_minimo - estoque_atual + CEIL(consumo_diario_medio * 30), 1)
        WHEN dias_cobertura <= 15 THEN 
            CEIL(consumo_diario_medio * 30)
        ELSE 0
    END as qtd_sugerida,
    -- NOVOS CAMPOS EXATAMENTE NO FINAL DA VIEW
    genero,
    cat
FROM calculos;

COMMENT ON VIEW public.v_sugestao_compras IS 'Inteligência de estoque: Sugestões de compra baseadas em giro real e estoque mínimo (agora com genero e categoria no final).';
