-- Adiciona coluna meta_mensal à tabela filiais, se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'filiais' AND column_name = 'meta_mensal'
    ) THEN
        ALTER TABLE public.filiais ADD COLUMN meta_mensal NUMERIC(15,2) DEFAULT 0.00;
        
        -- Atualiza as filiais existentes com uma meta padrão de 100.000 para demonstração
        UPDATE public.filiais SET meta_mensal = 100000.00 WHERE meta_mensal = 0.00 OR meta_mensal IS NULL;
    END IF;
END $$;
