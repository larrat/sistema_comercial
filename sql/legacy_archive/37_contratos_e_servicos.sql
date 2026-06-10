-- Migração 37: Módulo de Contratos e Serviços

-- 1. Tabela de Serviços (Catálogo de Mão de Obra)
CREATE TABLE IF NOT EXISTS public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id TEXT NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  custo_padrao NUMERIC(12,2) DEFAULT 0,
  preco_venda NUMERIC(12,2) DEFAULT 0,
  categoria TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Contratos (Venda de Projeto/Obra Fechada)
DO $$ BEGIN
    CREATE TYPE contrato_status AS ENUM ('ativo', 'concluido', 'cancelado', 'suspenso');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id TEXT NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
  cliente_id TEXT NOT NULL REFERENCES public.clientes(id),
  oportunidade_id UUID REFERENCES public.crm_oportunidades(id) ON DELETE SET NULL, -- Link com a venda do CRM
  titulo TEXT NOT NULL,
  data_inicio DATE,
  previsao_fim DATE,
  valor_total NUMERIC(12,2) DEFAULT 0,
  status contrato_status DEFAULT 'ativo'::contrato_status,
  observacoes TEXT,
  criado_por UUID REFERENCES auth.users(id),
  atualizado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Ordens de Serviço (Execução do Contrato)
DO $$ BEGIN
    CREATE TYPE os_status AS ENUM ('agendada', 'em_andamento', 'concluida', 'cancelada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id TEXT NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status os_status DEFAULT 'agendada'::os_status,
  data_agendada TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  responsavel_id UUID REFERENCES auth.users(id),
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) E POLÍTICAS
-- ==========================================

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

-- Serviços
DO $$ BEGIN
  CREATE POLICY "Acesso aos serviços da filial"
    ON public.servicos
    USING (public.can_access_filial(filial_id))
    WITH CHECK (public.can_access_filial(filial_id));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Contratos
DO $$ BEGIN
  CREATE POLICY "Acesso aos contratos da filial"
    ON public.contratos
    USING (public.can_access_filial(filial_id))
    WITH CHECK (public.can_access_filial(filial_id));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ordens de Serviço
DO $$ BEGIN
  CREATE POLICY "Acesso as OS da filial"
    ON public.ordens_servico
    USING (public.can_access_filial(filial_id))
    WITH CHECK (public.can_access_filial(filial_id));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
