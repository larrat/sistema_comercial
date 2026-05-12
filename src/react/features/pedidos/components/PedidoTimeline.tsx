import React from 'react';

export type TimelineEvent = {
  id: string;
  title: string;
  timestamp: string | null;
  user?: string | null;
  description?: string | null;
  isDone?: boolean;
};

type PedidoTimelineProps = {
  events: TimelineEvent[];
};

export function PedidoTimeline({ events }: PedidoTimelineProps) {
  if (!events.length) return null;

  return (
    <div className="rf-timeline">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const hasTime = !!event.timestamp;

        return (
          <div key={event.id} className={`rf-timeline-item ${!hasTime ? 'is-pending' : ''}`}>
            <div className="rf-timeline-rail">
              <div className={`rf-timeline-dot ${hasTime ? 'is-done' : ''}`} />
              {!isLast && <div className="rf-timeline-line" />}
            </div>
            
            <div className="rf-timeline-content pb-8">
              <div className="flex flex-col gap-1">
                <h4 className={`text-sm font-semibold m-0 ${hasTime ? 'text-slate-900' : 'text-slate-400'}`}>
                  {event.title}
                </h4>
                {hasTime ? (
                  <span className="text-[11px] text-slate-500 font-medium">
                    {new Date(event.timestamp!).toLocaleString('pt-BR')}
                    {event.user ? ` · ${event.user}` : ''}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Aguardando próximo evento...</span>
                )}
                {event.description && (
                  <p className="text-xs text-slate-500 mt-2 m-0 bg-slate-50 p-2 rounded-lg border border-slate-100 w-fit">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
