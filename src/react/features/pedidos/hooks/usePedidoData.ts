import { useEffect, useRef } from 'react';
import { usePedidoStore } from '../store/usePedidoStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { listPedidos } from '../services/pedidosApi';

export type UsePedidoDataOptions = {
  skip?: boolean;
};

export function usePedidoData(options: UsePedidoDataOptions = {}) {
  const { skip = false } = options;

  const setPedidos = usePedidoStore((s) => s.setPedidos);
  const setStatus = usePedidoStore((s) => s.setStatus);

  const session = useAuthStore((s) => s.session);
  const authStatus = useAuthStore((s) => s.status);
  const filialId = useFilialStore((s) => s.filialId);

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (skip) return;
    if (authStatus === 'unknown') return;
    if (authStatus === 'unauthenticated' || !session?.access_token) {
      setStatus('error', 'Sessão expirada. Faça login novamente.');
      return;
    }
    if (!filialId) {
      setStatus('error', 'Nenhuma filial selecionada.');
      return;
    }

    const { url, key, ready } = getSupabaseConfig();
    if (!ready) {
      setStatus('error', 'Configuração do Supabase ausente.');
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    setStatus('loading');

    listPedidos({ url, key, token: session.access_token, filialId })
      .then((data) => setPedidos(data))
      .catch((err: unknown) => {
        fetchedRef.current = false;
        setStatus('error', err instanceof Error ? err.message : 'Erro ao carregar pedidos.');
      });
  }, [skip, authStatus, session, filialId, setPedidos, setStatus]);

  function reload() {
    fetchedRef.current = false;
    setStatus('loading');
    if (!session?.access_token || !filialId) return;
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) return;
    fetchedRef.current = true;
    listPedidos({ url, key, token: session.access_token, filialId })
      .then((data) => setPedidos(data))
      .catch((err: unknown) => {
        fetchedRef.current = false;
        setStatus('error', err instanceof Error ? err.message : 'Erro ao recarregar pedidos.');
      });
  }

  return { reload };
}
