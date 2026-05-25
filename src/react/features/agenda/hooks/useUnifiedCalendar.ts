import { useQuery } from '@tanstack/react-query';
import { useFilialStore } from '../../../app/useFilialStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { agendaApi } from '../services/agendaApi';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';
import type { UnifiedCalendarEvent } from '../types';

export function useUnifiedCalendar(currentDate: Date) {
  const filialId = useFilialStore((s) => s.filialId);
  const session = useAuthStore((s) => s.session);
  const config = getSupabaseConfig();

  const token = session?.access_token;
  
  const start = startOfMonth(currentDate).toISOString();
  const end = endOfMonth(currentDate).toISOString();

  return useQuery({
    queryKey: ['unified_calendar', filialId, start, end],
    queryFn: async (): Promise<UnifiedCalendarEvent[]> => {
      if (!filialId || !token || !config.ready) return [];
      const ctx = { url: config.url, key: config.key, token, filialId };
      
      // 1. Busca eventos genéricos da agenda
      const agendaEvents = await agendaApi.getEventos(ctx, start, end);
      
      // 2. Busca Ordens de Serviço do período
      // Usando fetch direto aqui para simplificar a unificação, 
      // mas poderia estar na contratosApi
      const resOs = await fetch(
        `${ctx.url}/rest/v1/ordens_servico?filial_id=eq.${ctx.filialId}&data_agendada=gte.${start}&data_agendada=lte.${end}&select=*`,
        { headers: { 'Content-Type': 'application/json', apikey: ctx.key, Authorization: `Bearer ${token}` } }
      );
      const osList = resOs.ok ? await resOs.json() : [];

      const unified: UnifiedCalendarEvent[] = [];

      agendaEvents.forEach(e => {
        unified.push({
          id: `agenda_${e.id}`,
          title: e.titulo,
          start: parseISO(e.data_inicio),
          end: parseISO(e.data_fim),
          allDay: e.dia_inteiro,
          source: 'agenda',
          color: e.tipo === 'reuniao' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30',
          originalData: e
        });
      });

      osList.forEach((os: any) => {
        if (os.data_agendada) {
          unified.push({
            id: `os_${os.id}`,
            title: `O.S.: ${os.titulo}`,
            start: parseISO(os.data_agendada),
            // OS não tem data_fim por padrão, vamos assumir 1h para visualização
            end: new Date(new Date(os.data_agendada).getTime() + 60 * 60 * 1000), 
            allDay: false,
            source: 'ordem_servico',
            color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            originalData: os
          });
        }
      });

      // No futuro: aqui também entra a busca da API do Google Calendar e fazemos o push na lista.
      
      return unified;
    },
    enabled: !!filialId && !!token && config.ready,
  });
}
