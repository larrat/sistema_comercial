-- Migração 38: Módulo de Agenda e Integrações

-- 1. Tabela para Integrações do Usuário (ex: Google Calendar OAuth)
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google'
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, provider)
);

-- 2. Tabela de Eventos Genéricos da Agenda (reuniões, visitas, etc)
CREATE TYPE evento_tipo AS ENUM ('reuniao', 'visita', 'lembrete', 'outro');

CREATE TABLE IF NOT EXISTS public.agenda_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id TEXT NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo evento_tipo DEFAULT 'outro'::evento_tipo,
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  dia_inteiro BOOLEAN DEFAULT false,
  google_event_id TEXT, -- ID do evento lá no Google Calendar
  participantes JSONB DEFAULT '[]'::jsonb,
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Acesso as próprias integrações"
    ON public.user_integrations
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Acesso aos eventos da filial"
    ON public.agenda_eventos
    USING (public.can_access_filial(filial_id))
    WITH CHECK (public.can_access_filial(filial_id));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
