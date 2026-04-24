import { useCallback, useEffect } from 'react';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useCampanhasStore } from '../store/useCampanhasStore';
import { listCampanhas, listCampanhaEnvios } from '../services/campanhasApi';

export function useCampanhasData() {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId) ?? '';
  const reloadKey = useCampanhasStore((s) => s.reloadKey);
  const setCampanhas = useCampanhasStore((s) => s.setCampanhas);
  const setEnvios = useCampanhasStore((s) => s.setEnvios);
  const setLoading = useCampanhasStore((s) => s.setLoading);
  const setError = useCampanhasStore((s) => s.setError);

  const load = useCallback(async () => {
    if (!session?.access_token || !filialId) return;
    const cfg = getSupabaseConfig();
    if (!cfg.ready) return;

    const ctx = { url: cfg.url, key: cfg.key, token: session.access_token, filialId };
    setLoading(true);
    setError(null);
    try {
      const [campanhas, envios] = await Promise.all([
        listCampanhas(ctx),
        listCampanhaEnvios(ctx)
      ]);
      setCampanhas(campanhas);
      setEnvios(envios);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar campanhas.');
    } finally {
      setLoading(false);
    }
  }, [filialId, session?.access_token, setCampanhas, setEnvios, setLoading, setError]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);
}
