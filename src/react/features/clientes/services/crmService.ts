import { getSupabaseConfig } from '../../../app/supabaseConfig';
import type { ReguaCobrancaConfig } from '../../../../types/domain';

export type CobrancaLog = {
  id: string;
  filial_id: string;
  conta_id: string;
  cliente_id: string | null;
  cliente: string;
  regua_id: string;
  tipo_evento: 'vencimento_proximo' | 'vencimento_hoje' | 'atraso';
  canal: 'whatsapp' | 'email';
  destino: string | null;
  mensagem: string;
  status: 'pendente' | 'enviado' | 'erro';
  enviado_em: string | null;
  erro: string | null;
  criado_em: string;
};

export type ProcessarReguaResult = {
  ok: boolean;
  criados: number;
  ignorados: number;
  processado_em: string;
};

export const crmService = {
  async getRegras(token: string, filialId: string): Promise<ReguaCobrancaConfig[]> {
    const { url, key } = getSupabaseConfig();
    const res = await fetch(
      `${url}/rest/v1/regua_cobranca_config?filial_id=eq.${filialId}&ativo=eq.true`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${token}`
        }
      }
    );
    if (!res.ok) throw new Error('Falha ao buscar regras de cobrança');
    return await res.json();
  },

  async salvarRegra(token: string, regra: Partial<ReguaCobrancaConfig>): Promise<void> {
    const { url, key } = getSupabaseConfig();
    const res = await fetch(`${url}/rest/v1/regua_cobranca_config`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify(regra)
    });
    if (!res.ok) throw new Error('Falha ao salvar regra de cobrança');
  },

  /**
   * Processa a régua de cobrança via RPC no banco.
   * Cruza contas a receber abertas/vencidas com as regras configuradas
   * e gera registros em cobranca_log para envio via WhatsApp/Email.
   */
  async processarRegrasCobrança(token: string, filialId: string): Promise<ProcessarReguaResult> {
    const { url, key } = getSupabaseConfig();
    const res = await fetch(`${url}/rest/v1/rpc/rpc_processar_regua_cobranca`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_filial_id: filialId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || 'Falha ao processar régua de cobrança');
    }
    return await res.json() as ProcessarReguaResult;
  },

  /**
   * Busca os últimos registros do log de cobrança da filial.
   */
  async getCobrancaLog(token: string, filialId: string, limit = 20): Promise<CobrancaLog[]> {
    const { url, key } = getSupabaseConfig();
    const res = await fetch(
      `${url}/rest/v1/cobranca_log?filial_id=eq.${filialId}&order=criado_em.desc&limit=${limit}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${token}`
        }
      }
    );
    if (!res.ok) throw new Error('Falha ao buscar log de cobranças');
    return await res.json();
  },

  /**
   * Marca contas pendentes vencidas como 'vencido'.
   */
  async marcarContasVencidas(token: string, filialId: string): Promise<{ ok: boolean; contas_vencidas: number }> {
    const { url, key } = getSupabaseConfig();
    const res = await fetch(`${url}/rest/v1/rpc/rpc_marcar_contas_vencidas`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_filial_id: filialId })
    });
    if (!res.ok) throw new Error('Falha ao marcar contas vencidas');
    return await res.json();
  }
};
