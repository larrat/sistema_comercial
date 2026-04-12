import { useCallback, useEffect, useRef, useState } from 'react';

import type { Cliente, Pedido } from '../../../../types/domain';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import {
  fecharVendaPedido,
  listPedidosByCliente,
  splitClientePedidos
} from '../services/pedidosApi';

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
  const [fechandoId, setFechandoId] = useState<string | null>(null);
  const userEmailRef = useRef<string | null>(null);
  userEmailRef.current = (session?.user as { email?: string } | null)?.email ?? null;

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

  const fecharVenda = useCallback(
    async (pedido: Pedido): Promise<boolean> => {
      if (fechandoId) return false;
      setFechandoId(pedido.id);
      try {
        const updated = await fecharVendaPedido(resolveContext(), pedido, userEmailRef.current);
        setPedidosAbertos((prev) => prev.filter((p) => p.id !== updated.id));
        setPedidosFechados((prev) => [updated, ...prev]);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao fechar venda.');
        return false;
      } finally {
        setFechandoId(null);
      }
    },
    [fechandoId, resolveContext]
  );

  return {
    pedidosAbertos,
    pedidosFechados,
    loading,
    error,
    reload: loadData,
    fecharVenda,
    fechandoId
  };
}
