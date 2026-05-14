import { supabase } from '../../../infra/supabase';

export type FiscalResult = {
  ok: boolean;
  nfe_id?: string;
  nfe_url?: string;
  error?: string;
};

export const fiscalService = {
  /**
   * Simulates NFe emission.
   * In a real app, this would call a fiscal API (FocusNFe, PlugNFe, etc.)
   */
  async emitirNFe(pedidoId: string): Promise<FiscalResult> {
    try {
      // 1. Fetch order data
      const { data: pedido, error: fetchError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', pedidoId)
        .single();

      if (fetchError || !pedido) throw new Error('Pedido não encontrado');

      // 2. Simulate API Call delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 3. Update Order with mock NFe data
      const mockNfeId = `NFE-${Math.floor(Math.random() * 1000000)}`;
      const mockNfeUrl = `https://fsist.com.br/nfe/${mockNfeId}`;

      const { error: updateError } = await supabase
        .from('pedidos')
        .update({
          fiscal_status: 'emitido',
          nfe_id: mockNfeId,
          nfe_url: mockNfeUrl
        })
        .eq('id', pedidoId);

      if (updateError) throw updateError;

      return {
        ok: true,
        nfe_id: mockNfeId,
        nfe_url: mockNfeUrl
      };
    } catch (err) {
      console.error('Fiscal Error:', err);

      await supabase.from('pedidos').update({ fiscal_status: 'erro' }).eq('id', pedidoId);

      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido na emissão'
      };
    }
  }
};
