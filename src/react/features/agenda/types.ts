export type EventoTipo = 'reuniao' | 'visita' | 'lembrete' | 'outro';

export type AgendaEvento = {
  id: string;
  filial_id: string;
  titulo: string;
  descricao?: string;
  tipo: EventoTipo;
  data_inicio: string;
  data_fim: string;
  dia_inteiro: boolean;
  google_event_id?: string;
  participantes?: any;
  criado_por?: string;
  contrato_id?: string | null;
  criado_em: string;
  atualizado_em: string;
};

// Um tipo unificado para o visualizador de calendário (misturando OS, Agenda e Google)
export type UnifiedCalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  source: 'agenda' | 'ordem_servico' | 'google';
  color?: string;
  originalData?: any;
};
