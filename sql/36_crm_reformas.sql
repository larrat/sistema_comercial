-- Migração 36: CRM Reformas - Gestão de Oportunidades com Segregação por Filial

-- Criação do tipo enumerado para o estágio do funil
CREATE TYPE crm_estagio AS ENUM ('novo', 'visita', 'orcamento', 'negociacao', 'fechado', 'perdido');

-- Tabela principal de Oportunidades / Leads
CREATE TABLE public.crm_oportunidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id TEXT NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
  cliente_id TEXT REFERENCES public.clientes(id) ON DELETE SET NULL, -- Opcional, se já for cliente
  nome_lead VARCHAR(255) NOT NULL,
  telefone VARCHAR(50),
  endereco_obra TEXT,
  estagio crm_estagio DEFAULT 'novo'::crm_estagio,
  valor_estimado DECIMAL(12, 2) DEFAULT 0,
  tags TEXT[], -- array de tags como #Pintura, #ReformaCompleta
  criado_por UUID REFERENCES auth.users(id),
  atualizado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Histórico e Anotações (Timeline da Oportunidade)
CREATE TABLE public.crm_oportunidade_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidade_id UUID NOT NULL REFERENCES public.crm_oportunidades(id) ON DELETE CASCADE,
  filial_id TEXT NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE, -- redundância útil para RLS e particionamento
  tipo VARCHAR(50) DEFAULT 'nota', -- 'nota', 'mudanca_estagio', 'visita_agendada'
  conteudo TEXT NOT NULL,
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT now()
);



-- ==========================================
-- ROW LEVEL SECURITY (RLS) E POLÍTICAS
-- ==========================================

ALTER TABLE public.crm_oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_oportunidade_historico ENABLE ROW LEVEL SECURITY;

-- Oportunidades
CREATE POLICY "Acesso as oportunidades"
  ON public.crm_oportunidades
  USING (public.can_access_filial(filial_id))
  WITH CHECK (public.can_access_filial(filial_id));

-- Histórico
CREATE POLICY "Acesso ao historico das oportunidades"
  ON public.crm_oportunidade_historico
  USING (public.can_access_filial(filial_id))
  WITH CHECK (public.can_access_filial(filial_id));
