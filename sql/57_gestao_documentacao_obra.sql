-- 57_gestao_documentacao_obra.sql
-- Objetivo: Criar tabelas para Gestão de Documentos (Anexos) e Diário de Obra.
-- Idempotente: sim.

begin;

-- ==============================================================================
-- 1. TABELA DE ANEXOS E DOCUMENTOS
-- ==============================================================================
create table if not exists public.contrato_arquivos (
  id uuid primary key default gen_random_uuid(),
  filial_id text not null references public.filiais(id) on delete cascade,
  contrato_id uuid not null references public.contratos(id) on delete cascade,
  pedido_compra_id text references public.pedidos_compra(id) on delete set null,
  nome_arquivo text not null,
  url_arquivo text not null,
  tipo_documento text not null, -- 'contrato', 'nf_fornecedor', 'garantia', 'termo_aceite', 'foto_diario', 'outro'
  criado_por uuid references auth.users(id),
  criado_em timestamptz default now()
);

create index if not exists ix_contrato_arquivos_contrato on public.contrato_arquivos(contrato_id);
create index if not exists ix_contrato_arquivos_filial on public.contrato_arquivos(filial_id);

alter table public.contrato_arquivos enable row level security;

do $$ begin
  create policy "Acesso aos arquivos do contrato por filial"
    on public.contrato_arquivos
    for all to authenticated
    using (public.can_access_filial(filial_id))
    with check (public.can_access_filial(filial_id));
exception
  when duplicate_object then null;
end $$;

grant select, insert, update, delete on public.contrato_arquivos to authenticated;

-- ==============================================================================
-- 2. TABELA DIÁRIO DE OBRA
-- ==============================================================================
-- A tabela diario_obra já foi iniciada na migration 40, então precisamos adicionar 
-- as colunas novas caso não existam (data_registro, atividades_realizadas, pendencias_ou_faltas)
alter table public.diario_obra
  add column if not exists data_registro date not null default current_date,
  add column if not exists atividades_realizadas text,
  add column if not exists pendencias_ou_faltas text;


create index if not exists ix_diario_obra_contrato on public.diario_obra(contrato_id);
create index if not exists ix_diario_obra_filial on public.diario_obra(filial_id);
create index if not exists ix_diario_obra_data on public.diario_obra(data_registro);

alter table public.diario_obra enable row level security;

do $$ begin
  create policy "Acesso ao diário de obra por filial"
    on public.diario_obra
    for all to authenticated
    using (public.can_access_filial(filial_id))
    with check (public.can_access_filial(filial_id));
exception
  when duplicate_object then null;
end $$;

grant select, insert, update, delete on public.diario_obra to authenticated;

commit;
