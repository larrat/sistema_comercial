import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { listFiliaisAdmin } from '../services/filiaisApi';

export const FILIAIS_QUERY_KEY = ['filiais'];

export function useFiliaisData() {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: FILIAIS_QUERY_KEY,
    queryFn: async () => {
      const userId = String((session?.user as Record<string, unknown>)?.id ?? '');
      if (!session?.access_token || !userId) {
        throw new Error('Não autenticado');
      }
      
      const cfg = getSupabaseConfig();
      if (!cfg.ready) {
        throw new Error('Supabase não configurado');
      }

      return await listFiliaisAdmin(
        { url: cfg.url, key: cfg.key, token: session.access_token },
        userId
      );
    },
    enabled: !!session?.access_token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
