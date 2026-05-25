import { useState, useEffect } from 'react';
import { 
  addMonths, subMonths, format, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, 
  isToday, isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LucideCalendar, LucideChevronLeft, LucideChevronRight, LucidePlus } from 'lucide-react';
import { useUnifiedCalendar } from '../hooks/useUnifiedCalendar';
import type { UnifiedCalendarEvent } from '../types';
import { useGoogleIntegration } from '../hooks/useGoogleIntegration';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { AgendaEventModal } from './AgendaEventModal';
import { toast } from 'sonner';

export function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { integration, saveIntegration } = useGoogleIntegration();
  const config = getSupabaseConfig();
  
  // Custom hook que puxa dados da agenda interna, de OS e futuramente do Google
  const { data: events = [], isLoading } = useUnifiedCalendar(currentDate);

  useEffect(() => {
    // Intercepta o retorno do fluxo OAuth do Supabase na URL
    const hash = window.location.hash;
    if (hash && hash.includes('provider_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const providerToken = params.get('provider_token');
      const providerRefreshToken = params.get('provider_refresh_token');

      if (providerToken) {
        saveIntegration({ accessToken: providerToken, refreshToken: providerRefreshToken || undefined })
          .then(() => {
            // Limpa a URL para remover os tokens expostos
            window.history.replaceState(null, '', window.location.pathname);
          });
      }
    }
  }, [saveIntegration]);

  const handleConnectGoogle = () => {
    if (!config.ready) return;
    const url = new URL(`${config.url}/auth/v1/authorize`);
    url.searchParams.set('provider', 'google');
    url.searchParams.set('redirect_to', window.location.origin + '/app/agenda');
    url.searchParams.set('scopes', 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events');
    url.searchParams.set('query_params', '{"access_type":"offline","prompt":"consent"}');
    
    // Redireciona a página para a tela de login do Google (via Supabase)
    window.location.href = url.toString();
  };

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToday = () => setCurrentDate(new Date());

  // Calcula os dias para montar o grid do mês
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="flex h-full flex-col p-6 overflow-y-auto hide-scrollbar">
      <header className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <LucideCalendar className="h-6 w-6 text-indigo-500" />
            Agenda
          </h1>
          <p className="text-sm text-slate-400">
            Gerencie reuniões, eventos e Ordens de Serviço.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!integration ? (
            <button 
              onClick={handleConnectGoogle}
              className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-400 hover:bg-emerald-500/20"
            >
              Conectar Google
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-sm font-bold text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              Google Conectado
            </div>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-500/10 px-4 py-2 text-sm font-bold text-indigo-400 hover:bg-indigo-500/20"
          >
            <LucidePlus className="h-4 w-4" />
            Novo Evento
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900/50 p-1">
            <button onClick={prevMonth} className="rounded p-1 text-slate-400 hover:bg-white/10">
              <LucideChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={goToday} className="rounded px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-white/10">
              Hoje
            </button>
            <button onClick={nextMonth} className="rounded p-1 text-slate-400 hover:bg-white/10">
              <LucideChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Placeholder para conectar Google no futuro */}
        <div className="text-xs text-slate-500 flex items-center gap-2">
          {isLoading ? 'Sincronizando...' : `${events.length} eventos no período`}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex flex-col shrink-0 rounded-xl border border-white/10 bg-slate-900/40 overflow-hidden min-h-[600px]">
        {/* Week Headers */}
        <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.02]">
          {weekDays.map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
              {day}
            </div>
          ))}
        </div>
        
        {/* Days */}
        <div className="flex-1 grid grid-cols-7 auto-rows-[minmax(100px,1fr)] bg-white/5 gap-px">
          {calendarDays.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isDayToday = isToday(day);
            const dayEvents = events.filter(e => isSameDay(e.start, day));

            return (
              <div 
                key={day.toISOString()} 
                className={`relative bg-[#0f172a] p-2 transition-colors hover:bg-white/[0.02] ${!isCurrentMonth ? 'opacity-50' : ''}`}
              >
                <div className={`mb-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  isDayToday ? 'bg-indigo-500 text-white' : 'text-slate-400'
                }`}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1 overflow-y-auto max-h-[calc(100%-2rem)] hide-scrollbar">
                  {dayEvents.map(evt => (
                    <div 
                      key={evt.id} 
                      className={`truncate rounded px-1.5 py-1 text-[10px] font-semibold border ${evt.color}`}
                      title={`${format(evt.start, 'HH:mm')} - ${evt.title}`}
                    >
                      {!evt.allDay && <span className="opacity-75 mr-1">{format(evt.start, 'HH:mm')}</span>}
                      {evt.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <AgendaEventModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        selectedDate={currentDate} 
      />
    </div>
  );
}
