-- 70_iva_dual_preparacao.sql
-- Objetivo: Preparar schema para coexistência do regime tributário atual com o IVA Dual (IBS/CBS/IS).
-- Implementa versionamento temporal (Effective Dating) e cria o esqueleto da CBS/IBS nas transações.

begin;

-- =====================================================================================
-- 1. VERSIONAMENTO TEMPORAL (EFFECTIVE DATING) NAS REGRAS FISCAIS
-- =====================================================================================

-- 1.1 Matriz de ICMS
alter table public.fiscal_aliquotas_icms
  add column if not exists data_inicio_vigencia date default '2000-01-01',
  add column if not exists data_fim_vigencia date default '2099-12-31';

alter table public.fiscal_aliquotas_icms drop constraint if exists fiscal_aliquotas_icms_uf_origem_uf_destino_key;
alter table public.fiscal_aliquotas_icms add constraint uq_fiscal_aliquotas_icms_vigencia unique (uf_origem, uf_destino, data_inicio_vigencia);

-- 1.2 Regras PIS/COFINS
alter table public.fiscal_pis_cofins
  add column if not exists data_inicio_vigencia date default '2000-01-01',
  add column if not exists data_fim_vigencia date default '2099-12-31';

alter table public.fiscal_pis_cofins drop constraint if exists fiscal_pis_cofins_regime_tributario_key;
alter table public.fiscal_pis_cofins add constraint uq_fiscal_pis_cofins_vigencia unique (regime_tributario, data_inicio_vigencia);

-- 1.3 Regras de Tributação (Coração do Motor)
alter table public.fiscal_regras_tributacao
  add column if not exists data_inicio_vigencia date default '2000-01-01',
  add column if not exists data_fim_vigencia date default '2099-12-31';

-- =====================================================================================
-- 2. EVOLUÇÃO DO SCHEMA - ITENS DO PEDIDO E COMPRAS
-- =====================================================================================

alter table public.pedido_itens
  add column if not exists cbs_cst varchar(3),
  add column if not exists cbs_aliquota numeric(5,2) default 0,
  add column if not exists cbs_base numeric(12,2) default 0,
  add column if not exists cbs_valor numeric(12,2) default 0,
  
  add column if not exists ibs_cst varchar(3),
  add column if not exists ibs_aliquota numeric(5,2) default 0,
  add column if not exists ibs_base numeric(12,2) default 0,
  add column if not exists ibs_valor numeric(12,2) default 0,
  
  add column if not exists is_aliquota numeric(5,2) default 0,
  add column if not exists is_base numeric(12,2) default 0,
  add column if not exists is_valor numeric(12,2) default 0;

alter table public.pedido_compra_itens
  add column if not exists cbs_cst varchar(3),
  add column if not exists cbs_aliquota numeric(5,2) default 0,
  add column if not exists cbs_base numeric(12,2) default 0,
  add column if not exists cbs_valor numeric(12,2) default 0,
  
  add column if not exists ibs_cst varchar(3),
  add column if not exists ibs_aliquota numeric(5,2) default 0,
  add column if not exists ibs_base numeric(12,2) default 0,
  add column if not exists ibs_valor numeric(12,2) default 0,
  
  add column if not exists is_aliquota numeric(5,2) default 0,
  add column if not exists is_base numeric(12,2) default 0,
  add column if not exists is_valor numeric(12,2) default 0;

-- =====================================================================================
-- 3. REFATORAÇÃO DA RPC DO MOTOR FISCAL PARA CONSIDERAR VIGÊNCIA E IVA DUAL
-- =====================================================================================

create or replace function public.calcular_tributos_item(
  p_filial_id uuid,
  p_cliente_id uuid,
  p_produto_id text,
  p_qty numeric,
  p_preco_unitario numeric,
  p_tipo_operacao text default 'venda',
  p_data_emissao date default current_date -- Novo parâmetro
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
  
  v_cbs_valor numeric := 0;
  v_ibs_valor numeric := 0;
  v_is_valor numeric := 0;
  
  v_ibpt_valor numeric := 0;
  
  v_uf_cliente varchar(2);
  v_ind_contribuinte varchar(20);
begin
  -- 1. Carregar Filial
  select uf, regime_tributario into v_filial from public.filiais where id = p_filial_id;
  if not found then raise exception 'Filial não encontrada'; end if;

  -- 2. Carregar Cliente (Se for null, é consumidor final)
  if p_cliente_id is null then
    v_uf_cliente := v_filial.uf;
    v_ind_contribuinte := 'nao';
  else
    select uf, contribuinte_icms into v_cliente from public.clientes where id = p_cliente_id;
    if v_cliente.uf is null or v_cliente.uf = '' then
      v_uf_cliente := v_filial.uf;
    else
      v_uf_cliente := v_cliente.uf;
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

  -- 5. Identificar Regra Tributária (considerando data de emissão)
  select * into v_regra
  from public.fiscal_regras_tributacao
  where regime_filial in (v_filial.regime_tributario, 'todos')
    and uf_filial in (v_filial.uf, 'todos')
    and uf_cliente in (v_uf_cliente, 'todos')
    and tipo_operacao in (p_tipo_operacao, 'todos')
    and ind_contribuinte in (v_ind_contribuinte, 'todos')
    and p_data_emissao between data_inicio_vigencia and coalesce(data_fim_vigencia, '2099-12-31')
  order by prioridade asc
  limit 1;

  if not found then
    raise exception 'Nenhuma regra fiscal de ICMS/IVA encontrada para esse cruzamento na data atual.';
  end if;

  -- 6. Buscar Alíquotas Matriz ICMS (considerando data de emissão)
  select * into v_matriz
  from public.fiscal_aliquotas_icms
  where uf_origem = v_filial.uf 
    and uf_destino = v_uf_cliente
    and p_data_emissao between data_inicio_vigencia and coalesce(data_fim_vigencia, '2099-12-31');

  if found then
    if v_filial.uf = v_uf_cliente then
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

  -- 8. Cálculos PIS/COFINS e CBS/IBS
  -- Aqui se prevê que após a reforma (data de vigência > xxxx), a alíquota clássica pode zerar e a CBS/IBS assumir.
  select * into v_pis_cofins 
  from public.fiscal_pis_cofins 
  where regime_tributario = v_filial.regime_tributario
    and p_data_emissao between data_inicio_vigencia and coalesce(data_fim_vigencia, '2099-12-31');
    
  if found then
    v_pis_valor := v_base_calculo * (v_pis_cofins.aliquota_pis / 100.0);
    v_cofins_valor := v_base_calculo * (v_pis_cofins.aliquota_cofins / 100.0);
    
    -- Cálculos placeholder do IVA Dual (Exclusão da própria base)
    -- As alíquotas de CBS/IBS estariam definidas em tabelas adjacentes ou na própria regra.
    -- Como a legislação será ativada via "data_inicio_vigencia", inicializamos eles aqui.
  end if;

  -- 9. Retorno JSON Estruturado (Incluindo blocos do IVA Dual)
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
    
    -- IVA Dual - Preparação para a transição
    'cbs', jsonb_build_object(
      'cst', '000',
      'aliquota', 0,
      'base_calculo', round(v_base_calculo, 2),
      'valor', round(v_cbs_valor, 2)
    ),
    'ibs', jsonb_build_object(
      'cst', '000',
      'aliquota', 0,
      'base_calculo', round(v_base_calculo, 2),
      'valor', round(v_ibs_valor, 2)
    ),
    'is', jsonb_build_object(
      'aliquota', 0,
      'base_calculo', round(v_base_calculo, 2),
      'valor', round(v_is_valor, 2)
    ),
    
    'tributos_aproximados_ibpt', round(v_ibpt_valor, 2)
  );

end;
$$;

commit;
