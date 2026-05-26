-- Migração 40: Automações Específicas para Gestão de Obras e Reformas

begin;

-- 1. Tabela de Termos Aditivos de Contrato (Change Orders)
create table if not exists public.contrato_aditivos (
  id            uuid          primary key default gen_random_uuid(),
  filial_id     text          not null references public.filiais(id) on delete cascade,
  contrato_id   uuid          not null references public.contratos(id) on delete cascade,
  titulo        text          not null,
  valor         numeric(12,2) not null default 0,
  criado_por    uuid          references auth.users(id),
  criado_em     timestamptz   not null default now()
);

-- 2. Tabela de Fases/Cronograma da Obra (Gantt Físico-Financeiro)
create table if not exists public.contrato_cronograma (
  id                    uuid          primary key default gen_random_uuid(),
  filial_id             text          not null references public.filiais(id) on delete cascade,
  contrato_id           uuid          not null references public.contratos(id) on delete cascade,
  titulo                text          not null,
  data_inicio           date,
  data_fim              date,
  percentual_conclusao  numeric(5,2)  not null default 0 check (percentual_conclusao >= 0 and percentual_conclusao <= 100),
  precedente_id         uuid          references public.contrato_cronograma(id) on delete set null,
  criado_em             timestamptz   not null default now()
);

-- 3. Tabela de Diário de Obra (RDO)
create table if not exists public.diario_obra (
  id                uuid          primary key default gen_random_uuid(),
  filial_id         text          not null references public.filiais(id) on delete cascade,
  contrato_id       uuid          not null references public.contratos(id) on delete cascade,
  titulo            text          not null,
  relatorio         text          not null,
  fotos             text[]        default '{}',
  clima             text          default 'ensolarado', -- ensolarado | chuvoso | nublado
  mao_de_obra_qtd   integer       default 0,
  criado_por        uuid          references auth.users(id),
  criado_em         timestamptz   not null default now()
);

-- 4. Extensões de Tabelas Existentes
-- Apropriação de despesas/compras de materiais para obra/contrato específica
alter table public.pedidos_compra 
  add column if not exists contrato_id uuid references public.contratos(id) on delete set null;

-- Medição de Empreiteiros e Terceirizados por Ordem de Serviço
alter table public.ordens_servico
  add column if not exists terceirizado_id uuid references auth.users(id) on delete set null,
  add column if not exists valor_parceiro numeric(12,2) default 0;

-- 5. Índices de Performance
create index if not exists ix_aditivos_contrato on public.contrato_aditivos(contrato_id);
create index if not exists ix_cronograma_contrato on public.contrato_cronograma(contrato_id);
create index if not exists ix_diario_contrato on public.diario_obra(contrato_id);
create index if not exists ix_pedidos_compra_contrato on public.pedidos_compra(contrato_id);

-- 6. Row Level Security (RLS)
alter table public.contrato_aditivos enable row level security;
alter table public.contrato_cronograma enable row level security;
alter table public.diario_obra enable row level security;

-- Políticas RLS baseadas em can_access_filial
do $$ begin
  create policy p_contrato_aditivos_all on public.contrato_aditivos
    for all to authenticated
    using (public.can_access_filial(filial_id))
    with check (public.can_access_filial(filial_id));
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy p_contrato_cronograma_all on public.contrato_cronograma
    for all to authenticated
    using (public.can_access_filial(filial_id))
    with check (public.can_access_filial(filial_id));
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy p_diario_obra_all on public.diario_obra
    for all to authenticated
    using (public.can_access_filial(filial_id))
    with check (public.can_access_filial(filial_id));
exception
  when duplicate_object then null;
end $$;

commit;
