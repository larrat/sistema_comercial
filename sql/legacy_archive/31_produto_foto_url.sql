-- Migração para adicionar foto do produto e configurar storage
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Garante o bucket de produtos (se tiver permissão de storage)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('produtos', 'produtos', true)
ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN public.produtos.foto_url IS 'URL da foto do produto hospedada no Supabase Storage';
