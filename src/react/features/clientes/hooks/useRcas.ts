import { useCallback, useEffect, useState } from 'react';

import type { Rca } from '../../../../types/domain';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';

export function useRcas() {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const [rcas, setRcas] = useState<Rca[]>([]);

  const load = useCallback(async () => {
    if (!session?.access_token || !filialId) return;
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) return;

    try {
      const res = await fetch(
        `${url}/rest/v1/rcas?filial_id=eq.${encodeURIComponent(filialId)}&ativo=eq.true&order=nome`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${session.access_token}`
          },
          signal: AbortSignal.timeout(8000)
        }
      );
      if (!res.ok) return;
      const data: unknown = await res.json();
      if (Array.isArray(data)) setRcas(data as Rca[]);
    } catch {
      // não bloqueia o form se RCAs falharem
    }
  }, [filialId, session?.access_token]);

  useEffect(() => {
    void load();
  }, [load]);

  return rcas;
}
