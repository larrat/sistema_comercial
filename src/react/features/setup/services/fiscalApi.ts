import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { logAudit } from '../../../shared/services/auditService';

export interface FiscalRegra {
  id: string;
  filial_id: string;
  ncm: string;
  uf_origem: string;
  uf_destino: string;
  cst_icms: string;
  aliquota_icms: number;
  aliquota_fcp: number;
  cst_pis_cofins: string;
  aliquota_pis: number;
  aliquota_cofins: number;
  iva_cbs_percent?: number | null;
  iva_ibs_percent?: number | null;
  data_inicio_vigencia: string;
  data_fim_vigencia?: string | null;
  descricao?: string;
  criado_em: string;
}

export async function listRegrasFiscais(token: string, filialId: string): Promise<FiscalRegra[]> {
  const { url, key } = getSupabaseConfig();
  const res = await fetch(`${url}/rest/v1/fiscal_regras_tributacao?filial_id=eq.${filialId}&order=data_inicio_vigencia.desc`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Falha ao listar regras fiscais');
  return res.json();
}

export async function saveRegraFiscal(token: string, regra: Partial<FiscalRegra>): Promise<FiscalRegra> {
  const { url, key } = getSupabaseConfig();
  const res = await fetch(`${url}/rest/v1/fiscal_regras_tributacao`, {
    method: regra.id ? 'PATCH' : 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(regra)
  });
  
  if (!res.ok) throw new Error('Falha ao salvar regra fiscal');
  const data = await res.json();
  
  logAudit(token, 'fiscal_regras_tributacao', regra.id || 'new', regra.id ? 'UPDATE' : 'INSERT', regra);
  
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteRegraFiscal(token: string, id: string): Promise<void> {
  const { url, key } = getSupabaseConfig();
  const res = await fetch(`${url}/rest/v1/fiscal_regras_tributacao?id=eq.${id}`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) throw new Error('Falha ao excluir regra fiscal');
  logAudit(token, 'fiscal_regras_tributacao', id, 'DELETE', {});
}
