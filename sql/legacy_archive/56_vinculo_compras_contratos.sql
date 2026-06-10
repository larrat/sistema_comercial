-- 56_vinculo_compras_contratos.sql
-- Objetivo: Permitir o vinculo de Pedidos de Compra (Notas de Entrada) com Contratos (Obras/Reformas)
-- e criar uma View para apuracao de Custos e Rentabilidade por obra.
-- Idempotente: sim.

begin;

-- 1. Adicionar colunas de vinculo
alter table public.pedidos_compra 
add column if not exists contrato_id uuid references public.contratos(id) on delete set null;

alter table public.pedido_compra_itens 
add column if not exists contrato_id uuid references public.contratos(id) on delete set null;

-- Índices para buscas de notas por obra
create index if not exists ix_pc_contrato on public.pedidos_compra(contrato_id) where contrato_id is not null;
create index if not exists ix_pci_contrato on public.pedido_compra_itens(contrato_id) where contrato_id is not null;

-- 2. View de Rentabilidade por Obra (Contrato)
create or replace view public.vw_contratos_rentabilidade as
with custos_materiais as (
  -- Custo de material vem do item especifico OU do pedido caso o item nao tenha vinculo proprio
  select 
    coalesce(pci.contrato_id, pc.contrato_id) as contrato_id,
    sum(pci.total_item) as total_material
  from public.pedido_compra_itens pci
  join public.pedidos_compra pc on pc.id = pci.pedido_compra_id
  where coalesce(pci.contrato_id, pc.contrato_id) is not null
    and pc.status != 'cancelado'
  group by 1
)
select 
  c.id as contrato_id,
  c.filial_id,
  c.cliente_id,
  c.titulo,
  c.status,
  c.data_inicio,
  c.previsao_fim,
  c.valor_total as receita,
  coalesce(cm.total_material, 0) as custo_material,
  -- Placeholder para futura adição de custos com mão de obra/OS
  0::numeric as custo_mao_obra,
  coalesce(cm.total_material, 0) as custo_total,
  (c.valor_total - coalesce(cm.total_material, 0)) as margem_bruta,
  case 
    when c.valor_total > 0 
    then round(((c.valor_total - coalesce(cm.total_material, 0)) / c.valor_total * 100), 2)
    else 0 
  end as margem_percentual
from public.contratos c
left join custos_materiais cm on cm.contrato_id = c.id;

-- RLS da view: as permissões de leitura são baseadas nas tabelas de origem que já possuem RLS
grant select on public.vw_contratos_rentabilidade to authenticated;

commit;
