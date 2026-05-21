import { getSupabaseConfig } from '../../../app/supabaseConfig';

export type FiscalResult = {
  ok: boolean;
  nfe_id?: string;
  nfe_url?: string;
  error?: string;
};

export const fiscalService = {
  /**
   * Simulates NFe emission.
   */
  async emitirNFe(token: string, pedidoId: string): Promise<FiscalResult> {
    const { url, key } = getSupabaseConfig();
    const headers = {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      // 1. Fetch order data (check if exists)
      const resCheck = await fetch(`${url}/rest/v1/pedidos?id=eq.${pedidoId}`, {
        headers
      });
      const pedidos = await resCheck.json();
      if (!resCheck.ok || !pedidos.length) throw new Error('Pedido não encontrado');

      // 2. Simulate API Call delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 3. Update Order with mock NFe data
      const mockNfeId = `NFE-${Math.floor(Math.random() * 1000000)}`;
      const mockNfeUrl = `https://fsist.com.br/nfe/${mockNfeId}`;

      const resUpdate = await fetch(`${url}/rest/v1/pedidos?id=eq.${pedidoId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          fiscal_status: 'emitido',
          nfe_id: mockNfeId,
          nfe_url: mockNfeUrl
        })
      });

      if (!resUpdate.ok) throw new Error('Falha ao atualizar status fiscal do pedido');

      return {
        ok: true,
        nfe_id: mockNfeId,
        nfe_url: mockNfeUrl
      };
    } catch (err) {
      console.error('Fiscal Error:', err);

      await fetch(`${url}/rest/v1/pedidos?id=eq.${pedidoId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fiscal_status: 'erro' })
      }).catch((err) => console.error('Erro ao atualizar status fiscal:', err));

      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido na emissão'
      };
    }
  }
};
