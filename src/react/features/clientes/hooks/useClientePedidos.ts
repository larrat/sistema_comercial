import { useCallback, useEffect, useState } from 'react';

import type { Cliente, Pedido } from '../../../../types/domain';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { listPedidosByCliente, splitClientePedidos } from '../services/pedidosApi';

type Options = {
  cliente?: Cliente | null;
  skip?: boolean;
};

export function useClientePedidos({ cliente, skip = false }: Options) {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const [pedidosAbertos, setPedidosAbertos] = useState<Pedido[]>([]);
  const [pedidosFechados, setPedidosFechados] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveContext = useCallback(() => {
    if (!session?.access_token) {
      throw new Error('Sessao expirada. Faca login novamente.');
    }
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) {
      throw new Error('Configuracao do Supabase ausente.');
    }
    return { url, key, token: session.access_token, filialId };
  }, [filialId, session]);

  const loadData = useCallback(async () => {
    if (!cliente?.id || skip) return;

    setLoading(true);
    setError(null);
    try {
      const pedidos = await listPedidosByCliente(resolveContext(), cliente);
      const split = splitClientePedidos(pedidos);
      setPedidosAbertos(split.abertas);
      setPedidosFechados(split.fechadas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos.');
      setPedidosAbertos([]);
      setPedidosFechados([]);
    } finally {
      setLoading(false);
    }
  }, [cliente, resolveContext, skip]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return { pedidosAbertos, pedidosFechados, loading, error, reload: loadData };
}
