-- Migração 41: Faturamento por Marcos Físicos e Logística Reversa (Vale-Troca)

begin;

-- 1. Modificar Contas a Receber
-- Permitir que pedido_id seja opcional (nulo) para faturamentos diretos de contratos
alter table public.contas_receber 
  alter column pedido_id drop not null;

-- Adicionar colunas contrato_id e cronograma_id para faturamento de marcos de obra
alter table public.contas_receber 
  add column if not exists contrato_id uuid references public.contratos(id) on delete set null,
  add column if not exists cronograma_id uuid references public.contrato_cronograma(id) on delete set null;

-- 2. Modificar Cronograma de Contrato
-- Adicionar coluna valor_faturamento para carimbar o valor financeiro associado àquela etapa
alter table public.contrato_cronograma
  add column if not exists valor_faturamento numeric(12,2) not null default 0;

-- 3. Tabela de Vale-Trocas (Crédito do Cliente)
create table if not exists public.vale_trocas (
  id            uuid          primary key default gen_random_uuid(),
  filial_id     text          not null references public.filiais(id) on delete cascade,
  cliente_id    text          references public.clientes(id) on delete set null,
  codigo        text          not null unique,
  valor         numeric(12,2) not null default 0 check (valor > 0),
  status        text          not null default 'ativo', -- 'ativo' | 'utilizado'
  criado_em     timestamptz   not null default now()
);

-- 4. Tabela de Devoluções
create table if not exists public.devolucoes (
  id             uuid          primary key default gen_random_uuid(),
  filial_id      text          not null references public.filiais(id) on delete cascade,
  pedido_id      text          references public.pedidos(id) on delete set null,
  cliente_id     text          references public.clientes(id) on delete set null,
  vale_troca_id  uuid          references public.vale_trocas(id) on delete set null,
  criado_em      timestamptz   not null default now()
);

-- 5. Tabela de Itens Devolvidos
create table if not exists public.devolucao_itens (
  id             uuid          primary key default gen_random_uuid(),
  devolucao_id   uuid          not null references public.devolucoes(id) on delete cascade,
  produto_id     text          not null references public.produtos(id) on delete cascade,
  quantidade     integer       not null check (quantidade > 0),
  valor_unitario numeric(12,2) not null default 0
);

-- Índices para Performance e Integridade
create index if not exists ix_cr_contrato on public.contas_receber(contrato_id);
create index if not exists ix_cr_cronograma on public.contas_receber(cronograma_id);
create index if not exists ix_vales_cliente on public.vale_trocas(cliente_id);
create index if not exists ix_vales_codigo on public.vale_trocas(codigo);
create index if not exists ix_devolucao_pedido on public.devolucoes(pedido_id);

-- Ativar RLS
alter table public.vale_trocas enable row level security;
alter table public.devolucoes enable row level security;
alter table public.devolucao_itens enable row level security;

-- Políticas de Acesso RLS
do $$ begin
  create policy p_vale_trocas_all on public.vale_trocas
    for all to authenticated
    using (public.can_access_filial(filial_id))
    with check (public.can_access_filial(filial_id));
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy p_devolucoes_all on public.devolucoes
    for all to authenticated
    using (public.can_access_filial(filial_id))
    with check (public.can_access_filial(filial_id));
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy p_devolucao_itens_all on public.devolucao_itens
    for all to authenticated
    using (
      exists (
        select 1 from public.devolucoes d 
        where d.id = devolucao_id and public.can_access_filial(d.filial_id)
      )
    )
    with check (
      exists (
        select 1 from public.devolucoes d 
        where d.id = devolucao_id and public.can_access_filial(d.filial_id)
      )
    );
exception
  when duplicate_object then null;
end $$;

commit;
