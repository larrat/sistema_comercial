-- Nexus Intelligence: Marketing, CRM and Automation Infrastructure

-- 1. Marketing tracking for Clients
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
ADD COLUMN IF NOT EXISTS utm_term TEXT,
ADD COLUMN IF NOT EXISTS utm_content TEXT,
ADD COLUMN IF NOT EXISTS data_primeira_compra TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS valor_total_gasto DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_rfm JSONB DEFAULT '{"r": 0, "f": 0, "m": 0}'::JSONB,
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- 2. Marketing performance for Products
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS custo_marketing_estimado DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS taxa_conversao DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS categoria_marketing TEXT;

-- 3. Automation Metadata for Orders (Fiscal and Campaigns)
ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS fiscal_status TEXT DEFAULT 'pendente', -- pendente, emitido, erro
ADD COLUMN IF NOT EXISTS nfe_id TEXT,
ADD COLUMN IF NOT EXISTS nfe_url TEXT,
ADD COLUMN IF NOT EXISTS campanha_id TEXT;

-- 4. Invoicing for Financial Transactions
ALTER TABLE public.caixa_transacoes
ADD COLUMN IF NOT EXISTS nfe_id TEXT;

-- 5. CRM: Automation Config for Collection Reminders (Régua de Cobrança)
CREATE TABLE IF NOT EXISTS public.regua_cobranca_config (
    id TEXT PRIMARY KEY,
    filial_id TEXT REFERENCES public.filiais(id),
    tipo_evento TEXT NOT NULL, -- 'vencimento_proximo', 'vencimento_hoje', 'atraso'
    dias_offset INTEGER NOT NULL, -- -2 para 2 dias antes, 3 para 3 dias depois
    canal TEXT DEFAULT 'whatsapp', -- whatsapp, email
    template TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for the new table
ALTER TABLE public.regua_cobranca_config ENABLE ROW LEVEL SECURITY;

-- 6. View for Purchase Suggestions (Módulo 1)
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
        END as dias_cobertura
    FROM public.produtos p
    LEFT JOIN vendas_recentes v ON v.produto_id = p.id
)
SELECT 
    *,
    CASE 
        WHEN estoque_atual <= estoque_minimo OR dias_cobertura <= 7 THEN 'urgente'
        WHEN dias_cobertura <= 15 THEN 'atencao'
        ELSE 'ok'
    END as status_reposicao,
    CASE 
        WHEN estoque_atual < estoque_minimo THEN (estoque_minimo * 1.5) - estoque_atual
        ELSE 0
    END as qtd_sugerida
FROM calculos;

COMMENT ON VIEW public.v_sugestao_compras IS 'Inteligência de estoque: Sugestões de compra baseadas em giro real e estoque mínimo.';

-- 7. Function to calculate RFM and LTV
CREATE OR REPLACE FUNCTION public.fn_atualizar_metricas_cliente()
RETURNS TRIGGER AS $$
DECLARE
    v_total_gasto DECIMAL(15,2);
    v_freq INTEGER;
    v_recencia INTEGER;
    v_score_r INTEGER;
    v_score_f INTEGER;
    v_score_m INTEGER;
BEGIN
    -- 1. Calcula LTV (Valor Total Gasto) e Frequência
    SELECT 
        SUM(total), 
        COUNT(*)
    INTO v_total_gasto, v_freq
    FROM public.pedidos
    WHERE cliente_id = NEW.cliente_id 
      AND status = 'finalizado';

    -- 2. Calcula Recência (Dias desde a última compra)
    SELECT 
        EXTRACT(DAY FROM (NOW() - MAX(criado_em)))
    INTO v_recencia
    FROM public.pedidos
    WHERE cliente_id = NEW.cliente_id 
      AND status = 'finalizado';

    -- 3. Atribui Scores (Simples 1-5 baseado em quartis/regras de negócio)
    -- Recência
    IF v_recencia <= 30 THEN v_score_r := 5;
    ELSIF v_recencia <= 60 THEN v_score_r := 4;
    ELSIF v_recencia <= 90 THEN v_score_r := 3;
    ELSIF v_recencia <= 180 THEN v_score_r := 2;
    ELSE v_score_r := 1;
    END IF;

    -- Frequência
    IF v_freq >= 10 THEN v_score_f := 5;
    ELSIF v_freq >= 5 THEN v_score_f := 4;
    ELSIF v_freq >= 3 THEN v_score_f := 3;
    ELSIF v_freq >= 2 THEN v_score_f := 2;
    ELSE v_score_f := 1;
    END IF;

    -- Monetário (Exemplo: <1k, 1-5k, 5-15k, 15-50k, >50k)
    IF v_total_gasto >= 50000 THEN v_score_m := 5;
    ELSIF v_total_gasto >= 15000 THEN v_score_m := 4;
    ELSIF v_total_gasto >= 5000 THEN v_score_m := 3;
    ELSIF v_total_gasto >= 1000 THEN v_score_m := 2;
    ELSE v_score_m := 1;
    END IF;

    -- 4. Atualiza o cadastro do Cliente
    UPDATE public.clientes
    SET 
        valor_total_gasto = COALESCE(v_total_gasto, 0),
        score_rfm = jsonb_build_object('r', v_score_r, 'f', v_score_f, 'm', v_score_m),
        data_primeira_compra = COALESCE(data_primeira_compra, NEW.criado_em)
    WHERE id = NEW.cliente_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger to fire metrics update when an order is finalized
DROP TRIGGER IF EXISTS trg_cliente_metricas_pos_venda ON public.pedidos;
CREATE TRIGGER trg_cliente_metricas_pos_venda
AFTER UPDATE OF status ON public.pedidos
FOR EACH ROW
WHEN (NEW.status = 'finalizado' AND OLD.status != 'finalizado')
EXECUTE FUNCTION public.fn_atualizar_metricas_cliente();
