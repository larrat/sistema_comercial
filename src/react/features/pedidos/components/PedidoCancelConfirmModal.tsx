import { useState } from 'react';
import type { Pedido } from '../../../../types/domain';
import { Modal, StatusBadge, Button } from '../../../shared/ui';

type Props = {
  pedido: Pedido | null;
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (isRecusaAvaria?: boolean) => void;
};

function fmtCurrency(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PedidoCancelConfirmModal({ pedido, open, submitting, onClose, onConfirm }: Props) {
  const [isRecusaAvaria, setIsRecusaAvaria] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeOnOverlay={!submitting}
      title="Cancelar pedido"
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            Voltar
          </Button>
          <Button
            variant="danger"
            onClick={() => onConfirm(isRecusaAvaria)}
            loading={submitting}
            data-testid="pedido-cancelar-confirmar"
          >
            Confirmar cancelamento
          </Button>
        </>
      }
    >
      <div className="rf-ui-stack">
        <p className="table-cell-strong">
          Esta ação altera o status do pedido para cancelado. O restante das regras operacionais do
          pedido permanece igual.
        </p>

        {pedido ? (
          <div className="rf-ui-stack" style={{ gap: 6 }}>
            <div>
              <span className="table-cell-caption table-cell-muted">Pedido</span>
              <div>#{pedido.num}</div>
            </div>
            <div>
              <span className="table-cell-caption table-cell-muted">Cliente</span>
              <div>{pedido.cli || '—'}</div>
            </div>
            <div>
              <span className="table-cell-caption table-cell-muted">Valor</span>
              <div>{fmtCurrency(pedido.total)}</div>
            </div>
            <div>
              <span className="table-cell-caption table-cell-muted">Status atual</span>
              <div>
                <StatusBadge tone="warning">{String(pedido.status || '—')}</StatusBadge>
              </div>
            </div>
            
            <label className="flex items-start gap-2 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 cursor-pointer hover:bg-rose-500/10 transition-colors mt-3">
              <input
                type="checkbox"
                checked={isRecusaAvaria}
                onChange={(e) => setIsRecusaAvaria(e.target.checked)}
                className="rounded border-rose-500/30 bg-black/40 text-rose-500 focus:ring-0 focus:ring-offset-0 h-4 w-4 mt-0.5"
              />
              <div className="flex-1">
                <div className="text-[10px] font-black text-rose-400 uppercase tracking-wider">Recusa por Avaria no Transporte</div>
                <div className="text-[9px] text-slate-400 mt-0.5 leading-normal">
                  Selecione esta opção se o cliente recusou a entrega porque os produtos foram danificados no transporte. Isso registrará automaticamente as perdas físicas.
                </div>
              </div>
            </label>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
