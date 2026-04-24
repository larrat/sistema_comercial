import { StatusBadge } from '../../../shared/ui';
import type { CotacaoLog } from '../types';

type Props = { logs: CotacaoLog[] };

export function CotacaoLogs({ logs }: Props) {
  if (!logs.length) {
    return (
      <div className="rf-ui-empty">
        <p>Nenhuma importação registrada ainda.</p>
        <p className="table-cell-muted table-cell-caption">
          Importe a primeira planilha para acompanhar histórico, itens novos e falhas.
        </p>
      </div>
    );
  }

  return (
    <div className="rf-ui-stack">
      {logs.map((l, i) => (
        <div key={i} className="card-shell rf-ui-log-row">
          <div className="rf-ui-log-row__head">
            <span className="table-cell-strong">{l.arquivo || l.forn || '—'}</span>
            {l.forn && <StatusBadge tone="info">{l.forn}</StatusBadge>}
            {l.mes && (
              <StatusBadge tone="neutral">
                MÊS {l.mes.split('-').reverse().join('/')}
              </StatusBadge>
            )}
          </div>
          <div className="rf-ui-log-row__meta">
            <span className="table-cell-muted table-cell-caption">{l.data}</span>
            <StatusBadge tone="success">{l.novos ?? 0} novos</StatusBadge>
            {l.atu ? <StatusBadge tone="info">{l.atu} atualizados</StatusBadge> : null}
            {l.falhas ? <StatusBadge tone="danger">{l.falhas} falha(s)</StatusBadge> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
