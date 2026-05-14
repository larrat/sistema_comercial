import { supabase } from '../../../infra/supabase';
import type { ReguaCobrancaConfig } from '../../../../types/domain';

export const crmService = {
  async getRegras(filialId: string): Promise<ReguaCobrancaConfig[]> {
    const { data, error } = await supabase
      .from('regua_cobranca_config')
      .select('*')
      .eq('filial_id', filialId)
      .eq('ativo', true);

    if (error) throw error;
    return data || [];
  },

  async salvarRegra(regra: Partial<ReguaCobrancaConfig>): Promise<void> {
    const { error } = await supabase.from('regua_cobranca_config').upsert(regra);

    if (error) throw error;
  },

  /**
   * Simulated CRM Engine Trigger.
   * In production, this would be a Cron Job / Edge Function.
   */
  async processarRegrasCobrança(filialId: string): Promise<number> {
    // 1. Get active rules
    const regras = await this.getRegras(filialId);

    // 2. For each rule, find matching accounts (Simplified logic)
    let totalProcessado = 0;

    for (const regra of regras) {
      // Find accounts based on dias_offset
      // This is a simulation: in reality we would query 'contas_receber'
      totalProcessado += Math.floor(Math.random() * 5);
    }

    return totalProcessado;
  }
};
