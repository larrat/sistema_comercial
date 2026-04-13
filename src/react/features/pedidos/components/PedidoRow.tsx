import type { Pedido } from '../../../../types/domain';
import { ACAO_LABEL, NEXT_STATUS, normalizePedStatus } from '../types';

type Props = {
  pedido: Pedido;
  inFlight: boolean;
  onAvancar: () => void;
  onCancelar: () => void;
  onReabrir: () => void;
  onDetalhe: (id: string) => void;
};

const STATUS_BADGE: Record<string, string> = {
  orcamento: 'bdg bk',
  confirmado: 'bdg bb',
  em_separacao: 'bdg ba',
  entregue: 'bdg bg',
  cancelado: 'bdg br'
};

const STATUS_LABEL: Record<string, string> = {
  orcamento: 'Orçamento',
  confirmado: 'Confirmado',
  em_separacao: 'Em separação',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};

function fmt(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PedidoRow({ pedido, inFlight, onAvancar, onCancelar, onReabrir, onDetalhe }: Props) {
  const status = normalizePedStatus(pedido.status);
  const badgeClass = STATUS_BADGE[status] ?? 'bdg bk';
  const statusLabel = STATUS_LABEL[status] ?? status;
  const nextStatus = NEXT_STATUS[status];
  const acaoLabel = ACAO_LABEL[status];

  return (
    <div className="list-row" data-testid={`pedido-row-${pedido.id}`}>
      <div className="list-row-main">
        <button
          className="btn-link list-row-title"
          onClick={() => onDetalhe(pedido.id)}
          data-testid={`pedido-row-title-${pedido.id}`}
        >
          #{pedido.num} — {pedido.cli || '—'}
        </button>
        <span className={badgeClass}>{statusLabel}</span>
        {pedido.data && (
          <span className="list-row-meta">{pedido.data}</span>
        )}
        <span className="list-row-meta">{fmt(pedido.total)}</span>
      </div>

      <div className="list-row-actions">
        {nextStatus && acaoLabel && (
          <button
            className="btn btn-sm"
            disabled={inFlight}
            onClick={onAvancar}
            data-testid={`pedido-acao-avancar-${pedido.id}`}
          >
            {inFlight ? '...' : acaoLabel}
          </button>
        )}

        {status !== 'cancelado' && status !== 'entregue' && (
          <button
            className="btn btn-sm btn-danger"
            disabled={inFlight}
            onClick={onCancelar}
            data-testid={`pedido-acao-cancelar-${pedido.id}`}
          >
            Cancelar
          </button>
        )}

        {status === 'cancelado' && (
          <button
            className="btn btn-sm"
            disabled={inFlight}
            onClick={onReabrir}
            data-testid={`pedido-acao-reabrir-${pedido.id}`}
          >
            Reabrir
          </button>
        )}
      </div>
    </div>
  );
}
