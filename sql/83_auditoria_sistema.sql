-- 83_auditoria_sistema.sql
-- Objetivo: Fornecer um panorama da saúde da base de dados (auditoria em tempo real)
-- Retorna uma lista de pendências operacionais em formato padronizado.

begin;

create or replace function public.rpc_auditoria_sistema(
  p_filial_id text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_issues jsonb := '[]'::jsonb;
  v_count integer;
  
  -- Definição da estrutura de Issue: { id, type, title, description }
begin

  -- 1. Produtos sem NCM (Risco Fiscal)
  select count(*) into v_count
  from public.produtos
  where (p_filial_id is null or filial_id = p_filial_id)
    and ativo = true
    and ncm is null;
    
  if v_count > 0 then
    v_issues := v_issues || jsonb_build_object(
      'id', 'audit_prod_ncm',
      'type', 'warning',
      'title', 'Produtos sem NCM',
      'description', v_count || ' produtos não possuem NCM (classificação fiscal) preenchido.'
    );
  end if;

  -- 2. Clientes sem WhatsApp ou Email
  select count(*) into v_count
  from public.clientes
  where (p_filial_id is null or filial_id = p_filial_id)
    and ativo = true
    and (whatsapp is null or whatsapp = '')
    and (email is null or email = '');
    
  if v_count > 0 then
    v_issues := v_issues || jsonb_build_object(
      'id', 'audit_cli_contato',
      'type', 'warning',
      'title', 'Clientes sem Contato',
      'description', v_count || ' clientes cadastrados sem número de WhatsApp ou Email.'
    );
  end if;

  -- 3. Pedidos estagnados há mais de 7 dias
  select count(*) into v_count
  from public.pedidos
  where (p_filial_id is null or filial_id = p_filial_id)
    and status in ('orcamento', 'em_andamento', 'em_separacao')
    and data < (current_date - interval '7 days');
    
  if v_count > 0 then
    v_issues := v_issues || jsonb_build_object(
      'id', 'audit_pedidos_estagnados',
      'type', 'error',
      'title', 'Pedidos Estagnados',
      'description', v_count || ' pedidos não faturados abertos há mais de 7 dias.'
    );
  end if;

  -- 4. Contas a Receber Vencidas
  select count(*) into v_count
  from public.contas_receber
  where (p_filial_id is null or filial_id = p_filial_id)
    and status in ('pendente', 'vencido', 'parcial')
    and vencimento < current_date;
    
  if v_count > 0 then
    v_issues := v_issues || jsonb_build_object(
      'id', 'audit_contas_vencidas',
      'type', 'error',
      'title', 'Contas Vencidas',
      'description', v_count || ' contas a receber estão vencidas e requerem atenção.'
    );
  end if;

  -- 5. Estoque Negativo
  select count(*) into v_count
  from public.produtos
  where (p_filial_id is null or filial_id = p_filial_id)
    and ativo = true
    and esal < 0;
    
  if v_count > 0 then
    v_issues := v_issues || jsonb_build_object(
      'id', 'audit_estoque_negativo',
      'type', 'error',
      'title', 'Estoque Negativo',
      'description', v_count || ' produtos estão com saldo de estoque negativo no Kardex.'
    );
  end if;

  -- Retorno do array de inconsistências
  return v_issues;
end;
$$;

grant execute on function public.rpc_auditoria_sistema to authenticated;

comment on function public.rpc_auditoria_sistema is 'Gera relatório consolidado de saúde do sistema, apontando falhas fiscais, contábeis e de processo operacional.';

commit;
