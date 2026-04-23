import { useEffect, useRef, useState } from 'react';
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

const PGTO_LABEL: Record<string, string> = {
  a_vista: 'À vista',
  pix: 'PIX',
  boleto: 'Boleto',
  cartao: 'Cartão',
  cheque: 'Cheque'
};

function fmt(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getItemCount(itens: Pedido['itens']): number {
  if (Array.isArray(itens)) return itens.length;
  if (typeof itens === 'string') {
    try {
      return (JSON.parse(itens) as unknown[]).length;
    } catch {
      return 0;
    }
  }
  return 0;
}

export function PedidoRow({ pedido, inFlight, onAvancar, onCancelar, onReabrir, onDetalhe }: Props) {
  const [pendingCancel, setPendingCancel] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const prevStatusRef = useRef(pedido.status);

  useEffect(() => {
    if (prevStatusRef.current !== pedido.status) {
      prevStatusRef.current = pedido.status;
      setShowSuccess(true);
      const t = setTimeout(() => setShowSuccess(false), 1800);
      return () => clearTimeout(t);
    }
  }, [pedido.status]);

  const status = normalizePedStatus(pedido.status);
  const badgeClass = STATUS_BADGE[status] ?? 'bdg bk';
  const statusLabel = STATUS_LABEL[status] ?? status;
  const nextStatus = NEXT_STATUS[status];
  const acaoLabel = ACAO_LABEL[status];
  const itemCount = getItemCount(pedido.itens);
  const pgtoLabel = pedido.pgto ? (PGTO_LABEL[pedido.pgto] ?? pedido.pgto) : null;

  const isTerminal = status === 'entregue' || status === 'cancelado';

  return (
    <div
      className={`ped-row${showSuccess ? ' ped-row-success' : ''}`}
      data-testid={`pedido-row-${pedido.id}`}
    >
      {/* Pedido — número + forma de pagamento */}
      <div className="ped-col-num">
        <span className="ped-num">#{pedido.num}</span>
        {pgtoLabel && <span className="ped-meta-text">{pgtoLabel}</span>}
      </div>

      {/* Cliente — nome clicável + tipo / rca */}
      <div className="ped-col-client">
        <button
          className="ped-client-name"
          onClick={() => onDetalhe(pedido.id)}
          data-testid={`pedido-row-title-${pedido.id}`}
        >
          {pedido.cli || '—'}
        </button>
        {(pedido.tipo === 'atacado' || pedido.rca_nome) && (
          <div className="ped-client-meta">
            {pedido.tipo === 'atacado' && (
              <span className="bdg bb" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                Atacado
              </span>
            )}
            {pedido.rca_nome && (
              <span className="ped-meta-text">{pedido.rca_nome}</span>
            )}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="ped-col-status">
        <span className={badgeClass}>{statusLabel}</span>
      </div>

      {/* Data */}
      <div className="ped-col-date">{formatDate(pedido.data)}</div>

      {/* Valor + contagem de itens */}
      <div className="ped-col-value">
        <span className="ped-value">{fmt(pedido.total)}</span>
        {itemCount > 0 && (
          <span className="ped-items-count">
            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
          </span>
        )}
      </div>

      {/* Ações */}
      <div className="ped-col-actions">
        {!pendingCancel && (
          <>
            {nextStatus && acaoLabel && (
              <button
                className="btn btn-sm btn-p"
                disabled={inFlight}
                onClick={onAvancar}
                data-testid={`pedido-acao-avancar-${pedido.id}`}
              >
                {inFlight ? '...' : acaoLabel}
              </button>
            )}

            {!isTerminal && (
              <button
                className="btn btn-sm btn-r"
                disabled={inFlight}
                onClick={() => setPendingCancel(true)}
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
          </>
        )}

        {pendingCancel && (
          <div className="ped-confirm-cancel">
            <span className="ped-confirm-cancel-label">Cancelar pedido?</span>
            <button
              className="btn btn-sm btn-r"
              disabled={inFlight}
              onClick={() => {
                setPendingCancel(false);
                onCancelar();
              }}
              data-testid={`pedido-acao-cancelar-confirm-${pedido.id}`}
            >
              Sim
            </button>
            <button
              className="btn btn-sm"
              disabled={inFlight}
              onClick={() => setPendingCancel(false)}
              data-testid={`pedido-acao-cancelar-abort-${pedido.id}`}
            >
              Não
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
