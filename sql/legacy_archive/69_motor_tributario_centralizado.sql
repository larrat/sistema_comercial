-- 69_motor_tributario_centralizado.sql
-- Objetivo: Criar a base de dados fiscal centralizada para o motor tributário (Fase 1.3).
-- Mapeia regras de NCM, Matriz de ICMS interestadual, PIS/COFINS por regime e Regras de CST.

begin;

-- =====================================================================================
-- 1. TABELAS BASE FISCAIS
-- =====================================================================================

-- Cadastro Nacional de NCM e Tributação IBPT (Aproximada)
create table if not exists public.fiscal_ncms (
  ncm varchar(8) primary key,
  descricao text,
  cest varchar(7),
  aliq_ibpt_nacional numeric(5,2) default 0,
  aliq_ibpt_estadual numeric(5,2) default 0,
  aliq_ibpt_municipal numeric(5,2) default 0,
  criado_em timestamp with time zone default now()
);
comment on table public.fiscal_ncms is 'Tabela unificada de NCMs, CEST correspondente e alíquotas do IBPT para a lei da transparência fiscal.';

-- Matriz Interestadual de ICMS
create table if not exists public.fiscal_aliquotas_icms (
  id uuid primary key default gen_random_uuid(),
  uf_origem varchar(2) not null,
  uf_destino varchar(2) not null,
  aliquota_interna numeric(5,2) not null default 18.00,
  aliquota_interestadual numeric(5,2) not null default 12.00,
  fcp numeric(5,2) default 0,
  mva_st_original numeric(6,2) default 0, -- MVA ST base (ajustada dinamicamente na RPC)
  criado_em timestamp with time zone default now(),
  unique(uf_origem, uf_destino)
);
comment on table public.fiscal_aliquotas_icms is 'Matriz de cruzamento de ICMS entre Estados da Federação e margens de ST agregadas.';

-- Regras Padrões de PIS e COFINS por Regime Tributário
create table if not exists public.fiscal_pis_cofins (
  id uuid primary key default gen_random_uuid(),
  regime_tributario varchar(20) not null, -- 'simples_nacional', 'lucro_presumido', 'lucro_real'
  cst_pis varchar(2) not null,
  cst_cofins varchar(2) not null,
  aliquota_pis numeric(5,2) default 0,
  aliquota_cofins numeric(5,2) default 0,
  criado_em timestamp with time zone default now(),
  unique(regime_tributario)
);
comment on table public.fiscal_pis_cofins is 'Configurações globais de PIS e COFINS dependendo do regime da filial.';

-- Regras de Tributação (Coração do Motor Tributário)
create table if not exists public.fiscal_regras_tributacao (
  id uuid primary key default gen_random_uuid(),
  regime_filial varchar(20) not null, -- 'simples_nacional', 'lucro_presumido', 'lucro_real', 'todos'
  uf_filial varchar(5) default 'todos',
  uf_cliente varchar(5) default 'todos',
  tipo_operacao varchar(50) default 'venda', -- 'venda', 'devolucao', 'remessa', 'brinde'
  ind_contribuinte varchar(20) default 'todos', -- 'sim', 'nao', 'isento', 'todos'
  
  -- Outputs da Regra
  csosn_cst_icms varchar(3) not null, -- Ex: '102', '500', '000', '060'
  cfop varchar(4) not null,
  
  -- Modificadores
  is_isento boolean default false,
  is_st boolean default false,
  p_red_bc numeric(5,2) default 0,
  
  prioridade integer default 100, -- Regras com menor prioridade (ex: 1) sobrescrevem as genéricas (100)
  criado_em timestamp with time zone default now()
);
comment on table public.fiscal_regras_tributacao is 'Motor de decisão de CST, CSOSN e CFOP baseado no cruzamento de perfis e estados.';

-- =====================================================================================
-- 2. ALTERAÇÕES EM TABELAS EXISTENTES (PRODUTOS, FILIAIS E CLIENTES)
-- =====================================================================================

alter table public.filiais 
  add column if not exists regime_tributario varchar(20) default 'simples_nacional';

alter table public.clientes
  add column if not exists contribuinte_icms boolean default false,
  add column if not exists ie varchar(20);

alter table public.produtos
  add column if not exists ncm varchar(8),
  add column if not exists cest varchar(7),
  add column if not exists origem varchar(1) default '0'; -- 0=Nacional, 1=Estrangeira, etc

-- =====================================================================================
-- 3. SEED DE DADOS BÁSICOS PARA TESTE E INICIALIZAÇÃO
-- =====================================================================================

insert into public.fiscal_pis_cofins (regime_tributario, cst_pis, cst_cofins, aliquota_pis, aliquota_cofins)
values 
  ('simples_nacional', '49', '49', 0.00, 0.00),
  ('lucro_presumido', '01', '01', 0.65, 3.00),
  ('lucro_real', '01', '01', 1.65, 7.60)
on conflict do nothing;

-- Regras Genéricas de Exemplo
insert into public.fiscal_regras_tributacao (regime_filial, uf_filial, uf_cliente, tipo_operacao, ind_contribuinte, csosn_cst_icms, cfop, prioridade)
values 
  ('simples_nacional', 'todos', 'todos', 'venda', 'nao', '102', '5102', 100),
  ('simples_nacional', 'todos', 'todos', 'venda', 'sim', '101', '5102', 100),
  ('lucro_presumido', 'todos', 'todos', 'venda', 'nao', '000', '5102', 100)
on conflict do nothing;

-- Matriz SP para Teste
insert into public.fiscal_aliquotas_icms (uf_origem, uf_destino, aliquota_interna, aliquota_interestadual, fcp)
values 
  ('SP', 'SP', 18.00, 18.00, 0.00),
  ('SP', 'RJ', 20.00, 12.00, 2.00),
  ('SP', 'MG', 18.00, 12.00, 0.00)
on conflict do nothing;

-- =====================================================================================
-- 4. RPC DO MOTOR DE CÁLCULO DE TRIBUTOS EM TEMPO REAL
-- =====================================================================================
-- Limpar versões antigas para evitar ambiguidade
drop function if exists public.calcular_tributos_item(uuid, uuid, text, numeric, numeric, text);
drop function if exists public.calcular_tributos_item(uuid, uuid, text, numeric, numeric, text, date);
drop function if exists public.calcular_tributos_item(text, text, text, numeric, numeric, text);
drop function if exists public.calcular_tributos_item(text, text, text, numeric, numeric, text, date);

create or replace function public.calcular_tributos_item(
  p_filial_id text,
  p_cliente_id text,
  p_produto_id text,
  p_qty numeric,
  p_preco_unitario numeric,
  p_tipo_operacao text default 'venda'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_filial record;
  v_cliente record;
  v_produto record;
  v_regra record;
  v_matriz record;
  v_pis_cofins record;
  v_ncm record;
  
  v_base_calculo numeric := p_qty * p_preco_unitario;
  
  v_icms_base numeric := 0;
  v_icms_valor numeric := 0;
  v_icms_aliquota numeric := 0;
  
  v_st_base numeric := 0;
  v_st_valor numeric := 0;
  
  v_pis_valor numeric := 0;
  v_cofins_valor numeric := 0;
  
  v_ibpt_valor numeric := 0;
  
  v_uf_cliente varchar(2);
  v_ind_contribuinte varchar(20);
  v_regime_str varchar(20);
begin
  -- 1. Carregar Filial
  select estado, regime_tributario into v_filial from public.filiais where id = p_filial_id;
  if not found then raise exception 'Filial não encontrada'; end if;
  
  v_regime_str := case 
    when v_filial.regime_tributario::text = '1' then 'simples_nacional'
    when v_filial.regime_tributario::text = '2' then 'simples_nacional'
    when v_filial.regime_tributario::text = '3' then 'lucro_presumido'
    when v_filial.regime_tributario::text = '4' then 'lucro_real'
    else coalesce(v_filial.regime_tributario::text, 'simples_nacional')
  end;

  -- 2. Carregar Cliente (Se for null, é consumidor final)
  if p_cliente_id is null then
    v_uf_cliente := v_filial.estado;
    v_ind_contribuinte := 'nao';
  else
    select estado, contribuinte_icms into v_cliente from public.clientes where id = p_cliente_id;
    if v_cliente.estado is null or v_cliente.estado = '' then
      v_uf_cliente := v_filial.estado;
    else
      v_uf_cliente := v_cliente.estado;
    end if;
    v_ind_contribuinte := case when coalesce(v_cliente.contribuinte_icms, false) then 'sim' else 'nao' end;
  end if;

  -- 3. Carregar Produto
  select ncm, cest, origem into v_produto from public.produtos where id = p_produto_id;
  
  -- 4. Carregar NCM/IBPT
  if v_produto.ncm is not null then
    select aliq_ibpt_nacional into v_ncm from public.fiscal_ncms where ncm = v_produto.ncm limit 1;
    if found then
      v_ibpt_valor := v_base_calculo * (v_ncm.aliq_ibpt_nacional / 100.0);
    end if;
  end if;

  -- 5. Identificar Regra Tributária ideal por prioridade
  select * into v_regra
  from public.fiscal_regras_tributacao
  where regime_filial in (v_regime_str, 'todos')
    and uf_filial in (v_filial.estado, 'todos')
    and uf_cliente in (v_uf_cliente, 'todos')
    and tipo_operacao in (p_tipo_operacao, 'todos')
    and ind_contribuinte in (v_ind_contribuinte, 'todos')
  order by prioridade asc
  limit 1;

  if not found then
    raise exception 'Nenhuma regra fiscal de ICMS encontrada para esse cruzamento.';
  end if;

  -- 6. Buscar Alíquotas Matriz ICMS
  select * into v_matriz
  from public.fiscal_aliquotas_icms
  where uf_origem = v_filial.estado and uf_destino = v_uf_cliente;

  -- Se for interestadual e encontrou regra, usa alíquota interestadual, senão interna
  if found then
    if v_filial.estado = v_uf_cliente then
      v_icms_aliquota := v_matriz.aliquota_interna;
    else
      v_icms_aliquota := v_matriz.aliquota_interestadual;
    end if;
  end if;

  -- 7. Cálculos de ICMS
  if v_regra.is_isento then
    v_icms_base := 0;
    v_icms_valor := 0;
  else
    v_icms_base := v_base_calculo * (1.0 - (coalesce(v_regra.p_red_bc, 0) / 100.0));
    v_icms_valor := v_icms_base * (v_icms_aliquota / 100.0);
  end if;

  -- Se for regime Simples Nacional (e a regra retornar CSOSN que não seja 900), geralmente o valor ICMS vai no campo de "Crédito" e não no ICMS normal da NFe.
  -- Para fins de cálculo base, a engine fornece os dados soltos. A formatação XML definirá as tags.

  -- 8. Cálculos PIS/COFINS
  select * into v_pis_cofins from public.fiscal_pis_cofins where regime_tributario = v_regime_str;
  if found then
    v_pis_valor := v_base_calculo * (v_pis_cofins.aliquota_pis / 100.0);
    v_cofins_valor := v_base_calculo * (v_pis_cofins.aliquota_cofins / 100.0);
  end if;

  -- 9. Retorno Estruturado JSONB
  return jsonb_build_object(
    'origem', coalesce(v_produto.origem, '0'),
    'ncm', coalesce(v_produto.ncm, ''),
    'cest', coalesce(v_produto.cest, ''),
    'cfop', v_regra.cfop,
    'cst_csosn', v_regra.csosn_cst_icms,
    
    'icms', jsonb_build_object(
      'base_calculo', round(v_icms_base, 2),
      'aliquota', v_icms_aliquota,
      'valor', round(v_icms_valor, 2),
      'is_st', v_regra.is_st
    ),
    
    'st', jsonb_build_object(
      'base_calculo', round(v_st_base, 2),
      'valor', round(v_st_valor, 2)
    ),
    
    'pis', jsonb_build_object(
      'cst', coalesce(v_pis_cofins.cst_pis, '49'),
      'aliquota', coalesce(v_pis_cofins.aliquota_pis, 0),
      'valor', round(v_pis_valor, 2)
    ),
    
    'cofins', jsonb_build_object(
      'cst', coalesce(v_pis_cofins.cst_cofins, '49'),
      'aliquota', coalesce(v_pis_cofins.aliquota_cofins, 0),
      'valor', round(v_cofins_valor, 2)
    ),
    
    'tributos_aproximados_ibpt', round(v_ibpt_valor, 2)
  );

end;
$$;

grant execute on function public.calcular_tributos_item(text, text, text, numeric, numeric, text) to authenticated;

comment on function public.calcular_tributos_item(text, text, text, numeric, numeric, text) is 'Engine tributária centralizada. Executa cruzamento de filial, cliente e produto para calcular todos os tributos brasileiros incidentes por item.';

commit;
