-- 71_rpa_xml_mapeamentos.sql
-- Objetivo: Criar tabelas para automação de XMLs de fornecedores.
-- 1. fiscal_cfop_mapeamento (De-Para inteligente de operações).
-- 2. fornecedor_produto_vinculo (Vínculo cProd do fornecedor ao nosso id de produto).

begin;

create table if not exists public.fiscal_cfop_mapeamento (
  id uuid primary key default gen_random_uuid(),
  filial_id text, -- Opcional, caso a regra de de-para seja especifica da filial
  cfop_fornecedor varchar(4) not null,
  cfop_interno varchar(4) not null,
  finalidade varchar(50) default 'revenda', -- 'revenda', 'consumo', 'imobilizado', 'industrializacao'
  is_interestadual boolean default false,
  criado_em timestamp with time zone default now(),
  atualizado_em timestamp with time zone default now(),
  constraint uq_cfop_mapeamento unique (filial_id, cfop_fornecedor, finalidade, is_interestadual)
);
comment on table public.fiscal_cfop_mapeamento is 'Regras de De-Para (Conversão) de CFOP de entrada vs CFOP da nota do fornecedor.';

-- Tabela que memoriza que o SKU/CProd X do fornecedor CNPJ Y é o nosso Produto Z
create table if not exists public.fornecedor_produto_vinculo (
  id uuid primary key default gen_random_uuid(),
  fornecedor_cnpj varchar(14) not null,
  cprod_fornecedor varchar(100) not null,
  produto_id text not null references public.produtos(id) on delete cascade,
  criado_em timestamp with time zone default now(),
  atualizado_em timestamp with time zone default now(),
  constraint uq_fornecedor_produto unique (fornecedor_cnpj, cprod_fornecedor)
);
comment on table public.fornecedor_produto_vinculo is 'Memoriza associação (De-Para) do código do produto do fornecedor para nosso banco.';

-- Insert básico de exemplos CFOP (5102 -> 1102, 6102 -> 2102)
insert into public.fiscal_cfop_mapeamento (cfop_fornecedor, cfop_interno, finalidade, is_interestadual)
values
  ('5102', '1102', 'revenda', false),
  ('5405', '1403', 'revenda', false),
  ('6102', '2102', 'revenda', true),
  ('6404', '2403', 'revenda', true)
on conflict do nothing;

-- RLS e Policies (Opcional, porém recomendado em produção)
alter table public.fiscal_cfop_mapeamento enable row level security;
alter table public.fornecedor_produto_vinculo enable row level security;

create policy p_cfop_mapeamento_all on public.fiscal_cfop_mapeamento
for all to authenticated
using (true)
with check (true);

create policy p_fornecedor_produto_vinculo_all on public.fornecedor_produto_vinculo
for all to authenticated
using (true)
with check (true);

commit;
