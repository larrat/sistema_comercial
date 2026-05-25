import { useQuery } from '@tanstack/react-query';
import { useFilialStore } from '../../../app/useFilialStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { crmApi } from '../services/crmApi';

export function useCrmData() {
  const filialId = useFilialStore((s) => s.filialId);
  const session = useAuthStore((s) => s.session);
  const config = getSupabaseConfig();

  const token = session?.access_token;

  return useQuery({
    queryKey: ['crm', 'oportunidades', filialId],
    queryFn: async () => {
      if (!filialId || !token || !config.ready) return [];
      
      return crmApi.getOportunidades({
        url: config.url,
        key: config.key,
        token,
        filialId,
      });
    },
    enabled: !!filialId && !!token && config.ready,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
