-- 66_orcamentos_modalidade.sql
-- Objetivo: Adicionar suporte a modalidades 'empreitada' e 'administracao' aos orçamentos.
-- Idempotente: sim.

begin;

-- Adicionar os campos na tabela
do $$ begin
  alter table public.orcamentos_obra add column modalidade text not null default 'empreitada' check (modalidade in ('empreitada', 'administracao'));
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.orcamentos_obra add column taxa_administracao_percentual numeric(5,2) not null default 20.00;
exception when duplicate_column then null; end $$;

-- Atualizar a view de cálculo para lidar com a diferença nas margens
drop view if exists public.vw_orcamentos_calculados;
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
    o.modalidade,
    o.bdi_percentual,
    o.taxa_administracao_percentual,
    coalesce(ia.total_custo_direto, 0) as custo_direto_total,
    coalesce(ia.total_material, 0) as custo_material_total,
    coalesce(ia.total_mao_obra, 0) as custo_mao_obra_total,
    
    -- Preço de Venda
    case 
      when o.modalidade = 'administracao' then 
        round(coalesce(ia.total_custo_direto, 0) * (1 + (o.taxa_administracao_percentual / 100)), 2)
      else
        round(coalesce(ia.total_custo_direto, 0) * (1 + (o.bdi_percentual / 100)), 2)
    end as preco_venda_final,

    -- Margem Bruta
    case 
      when o.modalidade = 'administracao' then 
        round(coalesce(ia.total_custo_direto, 0) * (o.taxa_administracao_percentual / 100), 2)
      else
        round(coalesce(ia.total_custo_direto, 0) * (o.bdi_percentual / 100), 2)
    end as margem_bruta_projetada
from public.orcamentos_obra o
left join itens_agrupados ia on ia.orcamento_id = o.id;

grant select on public.vw_orcamentos_calculados to authenticated;

commit;
