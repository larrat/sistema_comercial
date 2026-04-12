import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useDashboardStore } from '../store/useDashboardStore';
import {
  fetchDashboardClientes,
  fetchDashboardPedidos,
  fetchDashboardProdutos
} from '../services/dashboardApi';

export function useDashboardData() {
  const setData = useDashboardStore((s) => s.setData);
  const setStatus = useDashboardStore((s) => s.setStatus);

  const session = useAuthStore((s) => s.session);
  const authStatus = useAuthStore((s) => s.status);
  const filialId = useFilialStore((s) => s.filialId);

  const fetchedRef = useRef(false);

  useEffect(() => {
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

    const ctx = { url, key, token: session.access_token };

    Promise.all([
      fetchDashboardPedidos(ctx, filialId),
      fetchDashboardProdutos(ctx, filialId),
      fetchDashboardClientes(ctx, filialId)
    ])
      .then(([pedidos, produtos, clientes]) => {
        setData({ pedidos, produtos, clientes });
      })
      .catch((err: unknown) => {
        fetchedRef.current = false;
        setStatus('error', err instanceof Error ? err.message : 'Erro ao carregar dados.');
      });
  }, [authStatus, session, filialId, setData, setStatus]);

  function reload() {
    fetchedRef.current = false;
    if (!session?.access_token || !filialId) return;
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) return;

    setStatus('loading');
    fetchedRef.current = true;

    const ctx = { url, key, token: session.access_token };
    Promise.all([
      fetchDashboardPedidos(ctx, filialId),
      fetchDashboardProdutos(ctx, filialId),
      fetchDashboardClientes(ctx, filialId)
    ])
      .then(([pedidos, produtos, clientes]) => setData({ pedidos, produtos, clientes }))
      .catch((err: unknown) => {
        fetchedRef.current = false;
        setStatus('error', err instanceof Error ? err.message : 'Erro ao recarregar dados.');
      });
  }

  return { reload };
}
