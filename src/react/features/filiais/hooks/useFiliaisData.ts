import { useCallback, useEffect } from 'react';

import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useFiliaisStore } from '../store/useFiliaisStore';
import { listFiliaisAdmin } from '../services/filiaisApi';

export function useFiliaisData() {
  const session = useAuthStore((s) => s.session);
  const reloadKey = useFiliaisStore((s) => s.reloadKey);
  const setFiliais = useFiliaisStore((s) => s.setFiliais);
  const setStatus = useFiliaisStore((s) => s.setStatus);

  const load = useCallback(async () => {
    const userId = String((session?.user as Record<string, unknown>)?.id ?? '');
    if (!session?.access_token || !userId) return;
    const cfg = getSupabaseConfig();
    if (!cfg.ready) return;

    setStatus('loading');
    try {
      const filiais = await listFiliaisAdmin(
        { url: cfg.url, key: cfg.key, token: session.access_token },
        userId
      );
      setFiliais(filiais);
    } catch (e) {
      setStatus('error', e instanceof Error ? e.message : 'Erro ao carregar filiais.');
    }
  }, [session?.access_token, setFiliais, setStatus]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);
}
