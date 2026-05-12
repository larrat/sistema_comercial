import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useDashboardStore } from '../store/useDashboardStore';
import { fetchDashboardData } from '../services/dashboardApi';

export function useDashboardData() {
  const periodo = useDashboardStore((s) => s.periodo);
  const setData = useDashboardStore((s) => s.setData);
  const setStatus = useDashboardStore((s) => s.setStatus);

  const session = useAuthStore((s) => s.session);
  const authStatus = useAuthStore((s) => s.status);
  const filialId = useFilialStore((s) => s.filialId);

  const lastFetchRef = useRef<string | null>(null);

  const load = useCallback(async () => {
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

    const fetchKey = `${filialId}:${periodo}`;
    if (lastFetchRef.current === fetchKey) return;
    lastFetchRef.current = fetchKey;

    setStatus('loading');

    const ctx = { url, key, token: session.access_token };

    try {
      const data = await fetchDashboardData(ctx, filialId, periodo);
      setData(data);
    } catch (err: unknown) {
      lastFetchRef.current = null;
      setStatus('error', err instanceof Error ? err.message : 'Erro ao carregar dados.');
    }
  }, [authStatus, session, filialId, periodo, setData, setStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(() => {
    lastFetchRef.current = null;
    void load();
  }, [load]);

  return { reload };
}
