import { useEffect } from 'react';

import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { loadCotacaoInitialData } from '../services/cotacaoApi';
import { useCotacaoStore } from '../store/useCotacaoStore';

export function useCotacaoData() {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const reloadVersion = useCotacaoStore((s) => s.reloadVersion);
  const setStatus = useCotacaoStore((s) => s.setStatus);
  const setData = useCotacaoStore((s) => s.setData);

  useEffect(() => {
    const token = session?.access_token || '';
    const config = getSupabaseConfig();

    if (!filialId) {
      setStatus('error', 'Selecione uma filial para consultar compras.');
      return;
    }

    if (!config.ready || !token) {
      setStatus('error', 'Sessão ou configuração indisponível para carregar compras.');
      return;
    }

    let cancelled = false;

    async function load() {
      setStatus('loading');

      try {
        const data = await loadCotacaoInitialData({
          url: config.url,
          key: config.key,
          token,
          filialId
        });

        if (cancelled) return;
        setData(data);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : 'Não foi possível carregar compras.';
        setStatus('error', message);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [filialId, reloadVersion, session?.access_token, setData, setStatus]);
}
