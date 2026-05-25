import { useQuery } from '@tanstack/react-query';
import { useFilialStore } from '../../filiais/store/useFilialStore';
import { useSessionStore } from '../../auth/store/useSessionStore';
import { useConfig } from '../../../app/config/configProvider';
import { crmApi } from '../services/crmApi';

export function useCrmData() {
  const filialId = useFilialStore((s) => s.filialId);
  const session = useSessionStore((s) => s.session);
  const config = useConfig();

  const token = session?.access_token;

  return useQuery({
    queryKey: ['crm', 'oportunidades', filialId],
    queryFn: async () => {
      if (!filialId || !token || !config.ready) return [];
      
      return crmApi.getOportunidades({
        url: config.backendUrl,
        key: config.supabaseAnonKey,
        token,
        filialId,
      });
    },
    enabled: !!filialId && !!token && config.ready,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
