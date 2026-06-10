-- 85_migracao_xml_lote.sql
-- Objetivo: Migrar a lógica de atualização item a item da importação de XML
-- para uma única chamada em lote (Bulk Update), evitando rate limits
-- e melhorando drasticamente o desempenho no frontend.

begin;

create or replace function public.rpc_atualizar_produtos_lote(
  p_filial_id text,
  p_payload_jsonb jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_updated integer;
begin
  -- p_payload_jsonb deve ser um array no formato:
  -- [{"cEAN": "123", "ncm": "1234", "cest": "123", "vUnCom": 10.50}]

  with registros as (
    select *
    from jsonb_to_recordset(p_payload_jsonb) as x(
      "cEAN" text,
      ncm text,
      cest text,
      "vUnCom" numeric
    )
    where x."cEAN" is not null and x."cEAN" <> '' and x."cEAN" <> 'SEM GTIN'
  ),
  atualizados as (
    update public.produtos p
    set 
      ncm = coalesce(r.ncm, p.ncm),
      cest = coalesce(r.cest, p.cest),
      custo = coalesce(r."vUnCom", p.custo),
      updated_at = now()
    from registros r
    where p.filial_id = p_filial_id
      and p.codigo_barras = r."cEAN"
    returning p.id
  )
  select count(*) into v_updated from atualizados;

  return jsonb_build_object(
    'success', true,
    'atualizados', v_updated
  );
end;
$$;

grant execute on function public.rpc_atualizar_produtos_lote to authenticated;

comment on function public.rpc_atualizar_produtos_lote is 'Atualiza NCM, CEST e custo de múltiplos produtos de uma vez cruzando pelo código de barras recebido no payload JSON.';

commit;
