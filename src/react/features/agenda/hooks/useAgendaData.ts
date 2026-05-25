import { useQuery } from '@tanstack/react-query';
import { useFilialStore } from '../../../app/useFilialStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { agendaApi } from '../services/agendaApi';
import { startOfMonth, endOfMonth } from 'date-fns';

export function useAgendaData(currentDate: Date) {
  const filialId = useFilialStore((s) => s.filialId);
  const session = useAuthStore((s) => s.session);
  const config = getSupabaseConfig();

  const token = session?.access_token;
  
  // Buscar o mês todo para visualização
  const start = startOfMonth(currentDate).toISOString();
  const end = endOfMonth(currentDate).toISOString();

  return useQuery({
    queryKey: ['agenda_eventos', filialId, start, end],
    queryFn: async () => {
      if (!filialId || !token || !config.ready) return [];
      return agendaApi.getEventos(
        { url: config.url, key: config.key, token, filialId },
        start,
        end
      );
    },
    enabled: !!filialId && !!token && config.ready,
  });
}
