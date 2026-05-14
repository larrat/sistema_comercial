import { getSupabaseConfig } from '../../../app/supabaseConfig';
import type { ReguaCobrancaConfig } from '../../../../types/domain';

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
   * Simulated CRM Engine Trigger.
   */
  async processarRegrasCobrança(token: string, filialId: string): Promise<number> {
    const regras = await this.getRegras(token, filialId);
    let totalProcessado = 0;

    for (const _regra of regras) {
      // Simulation
      totalProcessado += Math.floor(Math.random() * 5);
    }

    return totalProcessado;
  }
};
