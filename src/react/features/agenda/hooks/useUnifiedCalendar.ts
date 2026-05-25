import { useQuery } from '@tanstack/react-query';
import { useFilialStore } from '../../../app/useFilialStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { agendaApi } from '../services/agendaApi';
import { googleCalendarApi } from '../services/googleCalendarApi';
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
      
      // Start top-level requests concurrently
      const [agendaEvents, resOs, resInteg] = await Promise.all([
        agendaApi.getEventos(ctx, start, end),
        fetch(
          `${ctx.url}/rest/v1/ordens_servico?filial_id=eq.${ctx.filialId}&data_agendada=gte.${start}&data_agendada=lte.${end}&select=*`,
          { headers: { 'Content-Type': 'application/json', apikey: ctx.key, Authorization: `Bearer ${token}` } }
        ),
        fetch(
          `${ctx.url}/rest/v1/user_integrations?user_id=eq.${session.user.id}&provider=eq.google&select=*`,
          { headers: { 'Content-Type': 'application/json', apikey: ctx.key, Authorization: `Bearer ${token}` } }
        )
      ]);

      const osList = resOs.ok ? await resOs.json() : [];
      const integration = resInteg.ok ? (await resInteg.json())[0] : null;

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

      // 4. Se tiver Google integrado, busca do Google!
      if (integration && integration.access_token) {
        try {
          const calendars = await googleCalendarApi.getCalendarList(integration.access_token);
          
          // Pra cada agenda, busca os eventos do mês (de forma CONCORRENTE)
          const calendarPromises = (calendars.items || []).map(async (cal: any) => {
            const googleEvents = await googleCalendarApi.getEvents(integration.access_token, start, end, cal.id);
            return googleEvents.items || [];
          });
          
          const allGoogleEventsArrays = await Promise.all(calendarPromises);
          const flatGoogleEvents = allGoogleEventsArrays.flat();
          
          flatGoogleEvents.forEach((ge: any) => {
            if (ge.start?.dateTime || ge.start?.date) {
              unified.push({
                id: `google_${ge.id}`,
                title: ge.summary || 'Sem Título',
                start: parseISO(ge.start.dateTime || ge.start.date),
                end: parseISO(ge.end?.dateTime || ge.end?.date || ge.start.date),
                allDay: !!ge.start.date,
                source: 'google',
                color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                originalData: ge
              });
            }
          });
        } catch (err) {
          console.error("Falha ao buscar Google Calendar (o token pode estar expirado):", err);
        }
      }
      
      return unified;
    },
    enabled: !!filialId && !!token && config.ready,
    staleTime: 1000 * 30, // 30 segundos de cache
    refetchInterval: 1000 * 60, // Recarrega silenciosamente a cada 1 minuto
  });
}
