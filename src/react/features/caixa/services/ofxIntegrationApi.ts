import { getSupabaseConfig } from '../../../app/supabaseConfig';
import type { TituloSistema } from './ofxService';

export async function listTitulosPendentes(token: string, filialId: string): Promise<TituloSistema[]> {
  const { url, key } = getSupabaseConfig();
  
  // Contas a pagar pendentes
  const p1 = fetch(`${url}/rest/v1/contas_pagar?filial_id=eq.${filialId}&status=eq.pendente&select=id,valor,vencimento,fornecedor_nome`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` }
  });
  
  // Contas a receber abertas ou com baixa parcial
  const p2 = fetch(`${url}/rest/v1/contas_receber?filial_id=eq.${filialId}&status=in.(aberta,parcial)&select=id,valor_em_aberto,data_vencimento,clientes(nome)`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` }
  });

  const [resPagar, resReceber] = await Promise.all([p1, p2]);
  
  const pagar = await resPagar.json();
  const receber = await resReceber.json();

  const titulos: TituloSistema[] = [];

  for (const t of pagar) {
    titulos.push({
      id: t.id,
      valor: t.valor,
      vencimento: t.vencimento,
      nome: t.fornecedor_nome || 'Desconhecido',
      tipo: 'pagar'
    });
  }

  for (const t of receber) {
    titulos.push({
      id: t.id,
      valor: t.valor_em_aberto,
      vencimento: t.data_vencimento,
      nome: t.clientes?.nome || 'Cliente',
      tipo: 'receber'
    });
  }

  return titulos;
}
