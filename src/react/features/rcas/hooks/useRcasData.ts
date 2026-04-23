import { useCallback, useEffect } from 'react';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useRcasStore } from '../store/useRcasStore';
import { listRcas } from '../services/rcasApi';

export function useRcasData() {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId) ?? '';
  const reloadKey = useRcasStore((s) => s.reloadKey);
  const setRcas = useRcasStore((s) => s.setRcas);
  const setLoading = useRcasStore((s) => s.setLoading);
  const setError = useRcasStore((s) => s.setError);

  const load = useCallback(async () => {
    if (!session?.access_token || !filialId) return;
    const cfg = getSupabaseConfig();
    if (!cfg.ready) return;

    setLoading(true);
    setError(null);
    try {
      const data = await listRcas({
        url: cfg.url,
        key: cfg.key,
        token: session.access_token,
        filialId
      });
      setRcas(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar vendedores.');
    } finally {
      setLoading(false);
    }
  }, [filialId, session?.access_token, setRcas, setLoading, setError]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);
}
