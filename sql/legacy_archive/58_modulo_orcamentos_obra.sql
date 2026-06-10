-- 58_modulo_orcamentos_obra.sql
-- Objetivo: Criar as tabelas para a "Planilha Mestra" de Orçamentos com cálculo de BDI.
-- Idempotente: sim.

begin;

-- 1. Tabela Cabeçalho de Orçamentos
create table if not exists public.orcamentos_obra (
    id uuid primary key default gen_random_uuid(),
    filial_id text not null references public.filiais(id),
    cliente_id text references public.clientes(id) on delete set null,
    cliente_nome text, -- Para prospects rápidos que ainda não estão no cadastro
    titulo text not null,
    descricao_escopo text,
    bdi_percentual numeric(5,2) not null default 30.00,
    status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aprovado', 'rejeitado')),
    data_validade date,
    
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),
    criado_por uuid references auth.users(id) on delete set null
);

-- 2. Tabela de Itens (A Planilha Mestra)
create table if not exists public.orcamento_obra_itens (
    id uuid primary key default gen_random_uuid(),
    orcamento_id uuid not null references public.orcamentos_obra(id) on delete cascade,
    
    -- Organização
    ambiente text not null default 'Geral', -- Ex: Sala, Quarto 1, Banheiro
    ordem_apresentacao integer not null default 0,
    
    -- Escopo Técnico
    descricao_servico text not null,
    unidade text not null default 'un', -- m2, ml, vb, pt, un
    quantidade numeric(10,2) not null default 1.00,
    
    -- Custos (O que a RSC paga)
    custo_material_unitario numeric(12,2) not null default 0.00,
    custo_mao_obra_unitario numeric(12,2) not null default 0.00,
    
    criado_em timestamptz not null default now()
);

-- Índices para performance
create index if not exists ix_orcamentos_filial on public.orcamentos_obra(filial_id);
create index if not exists ix_orcamentos_cliente on public.orcamentos_obra(cliente_id);
create index if not exists ix_orcamentos_itens_orc on public.orcamento_obra_itens(orcamento_id);

-- 3. View para Cálculo Automático do BDI e Rentabilidade do Orçamento
create or replace view public.vw_orcamentos_calculados as
with itens_agrupados as (
    select 
        oi.orcamento_id,
        sum((oi.custo_material_unitario + oi.custo_mao_obra_unitario) * oi.quantidade) as total_custo_direto,
        sum(oi.custo_material_unitario * oi.quantidade) as total_material,
        sum(oi.custo_mao_obra_unitario * oi.quantidade) as total_mao_obra
    from public.orcamento_obra_itens oi
    group by oi.orcamento_id
)
select 
    o.id as orcamento_id,
    o.filial_id,
    o.bdi_percentual,
    coalesce(ia.total_custo_direto, 0) as custo_direto_total,
    coalesce(ia.total_material, 0) as custo_material_total,
    coalesce(ia.total_mao_obra, 0) as custo_mao_obra_total,
    -- O Preço de Venda = Custo Direto * (1 + (BDI/100))
    round(coalesce(ia.total_custo_direto, 0) * (1 + (o.bdi_percentual / 100)), 2) as preco_venda_final,
    -- O Lucro/Margem do projeto = Preço Final - Custos
    round(coalesce(ia.total_custo_direto, 0) * (1 + (o.bdi_percentual / 100)), 2) - coalesce(ia.total_custo_direto, 0) as margem_bruta_projetada
from public.orcamentos_obra o
left join itens_agrupados ia on ia.orcamento_id = o.id;

-- 4. RLS (Row Level Security)
alter table public.orcamentos_obra enable row level security;
alter table public.orcamento_obra_itens enable row level security;

do $$ begin
  create policy "Acesso orcamentos por filial"
    on public.orcamentos_obra for all to authenticated
    using (public.can_access_filial(filial_id))
    with check (public.can_access_filial(filial_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Acesso orcamentos_itens por filial"
    on public.orcamento_obra_itens for all to authenticated
    using (orcamento_id in (select id from public.orcamentos_obra where public.can_access_filial(filial_id)))
    with check (orcamento_id in (select id from public.orcamentos_obra where public.can_access_filial(filial_id)));
exception when duplicate_object then null; end $$;

-- Permissões
grant select, insert, update, delete on public.orcamentos_obra to authenticated;
grant select, insert, update, delete on public.orcamento_obra_itens to authenticated;
grant select on public.vw_orcamentos_calculados to authenticated;

commit;
