import { useState } from 'react';
import type { Pedido, PedidoItem } from '../../../../types/domain';
import { usePedidoMutations } from '../hooks/usePedidoMutations';
import { PedidoItemsSection } from './PedidoItemsSection';
import { ACAO_LABEL, NEXT_STATUS, normalizePedStatus } from '../types';

type Props = {
  pedido: Pedido;
  onEditar: (id: string) => void;
  onClose: () => void;
};

const STATUS_LABEL: Record<string, string> = {
  orcamento: 'Orçamento',
  confirmado: 'Confirmado',
  em_separacao: 'Em separação',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};

const STATUS_BADGE: Record<string, string> = {
  orcamento: 'bdg bk',
  confirmado: 'bdg bb',
  em_separacao: 'bdg ba',
  entregue: 'bdg bg',
  cancelado: 'bdg br'
};

const PGTO_LABEL: Record<string, string> = {
  a_vista: 'À vista',
  pix: 'PIX',
  boleto: 'Boleto',
  cartao: 'Cartão',
  cheque: 'Cheque'
};

const PRAZO_LABEL: Record<string, string> = {
  imediato: 'Imediato',
  '7d': '7 dias',
  '15d': '15 dias',
  '30d': '30 dias',
  '60d': '60 dias'
};

function fmtCurrency(v: number | null | undefined) {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseItens(pedido: Pedido): PedidoItem[] {
  if (Array.isArray(pedido.itens)) return pedido.itens as PedidoItem[];
  try {
    const parsed = JSON.parse(pedido.itens as string);
    return Array.isArray(parsed) ? (parsed as PedidoItem[]) : [];
  } catch {
    return [];
  }
}

export function PedidoDetailPanel({ pedido, onEditar, onClose }: Props) {
  const { avancarStatus, cancelarPedido, reabrirPedido, gerarContaManual, inFlight } =
    usePedidoMutations();
  const [contaMsg, setContaMsg] = useState<string | null>(null);
  const status = normalizePedStatus(pedido.status);
  const badgeClass = STATUS_BADGE[status] ?? 'bdg bk';
  const statusLabel = STATUS_LABEL[status] ?? status;
  const nextStatus = NEXT_STATUS[status];
  const acaoLabel = ACAO_LABEL[status];
  const isInFlight = inFlight.has(pedido.id);
  const itens = parseItens(pedido);

  return (
    <div className="card card-shell" data-testid="pedido-detail-panel">
      <div className="modal-shell-head">
        <div>
          <div className="mt">Pedido #{pedido.num}</div>
          <div className="cli-react-shell__chips" style={{ marginTop: '0.25rem' }}>
            <span className={badgeClass}>{statusLabel}</span>
            {pedido.data && <span className="bdg bk">{pedido.data}</span>}
            <span className="bdg bg">{fmtCurrency(pedido.total)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <button className="btn btn-sm" onClick={() => onEditar(pedido.id)} data-testid="pedido-detail-editar">
            Editar
          </button>
          <button className="btn btn-sm" onClick={onClose} data-testid="pedido-detail-close">
            Fechar
          </button>
        </div>
      </div>

      <div className="modal-shell-body">
        <div className="fg c3">
          <div>
            <div className="fl">Cliente</div>
            <div className="fv">{pedido.cli || '—'}</div>
          </div>
          {pedido.rca_nome && (
            <div>
              <div className="fl">RCA</div>
              <div className="fv">{pedido.rca_nome}</div>
            </div>
          )}
          <div>
            <div className="fl">Tipo</div>
            <div className="fv">{pedido.tipo === 'atacado' ? 'Atacado' : 'Varejo'}</div>
          </div>
          <div>
            <div className="fl">Pagamento</div>
            <div className="fv">{PGTO_LABEL[pedido.pgto ?? ''] ?? pedido.pgto ?? '—'}</div>
          </div>
          <div>
            <div className="fl">Prazo</div>
            <div className="fv">{PRAZO_LABEL[pedido.prazo ?? ''] ?? pedido.prazo ?? '—'}</div>
          </div>
          {pedido.obs && (
            <div>
              <div className="fl">Obs.</div>
              <div className="fv">{pedido.obs}</div>
            </div>
          )}
        </div>

        <PedidoItemsSection itens={itens} produtos={[]} tipo={pedido.tipo ?? 'varejo'} readOnly />

        <div className="modal-actions" style={{ marginTop: '1rem' }}>
          {nextStatus && acaoLabel && (
            <button
              className="btn btn-sm"
              disabled={isInFlight}
              onClick={() => void avancarStatus(pedido)}
              data-testid="pedido-detail-avancar"
            >
              {isInFlight ? '...' : acaoLabel}
            </button>
          )}
          {status !== 'cancelado' && status !== 'entregue' && (
            <button
              className="btn btn-sm btn-danger"
              disabled={isInFlight}
              onClick={() => void cancelarPedido(pedido)}
              data-testid="pedido-detail-cancelar"
            >
              Cancelar
            </button>
          )}
          {status === 'cancelado' && (
            <button
              className="btn btn-sm"
              disabled={isInFlight}
              onClick={() => void reabrirPedido(pedido)}
              data-testid="pedido-detail-reabrir"
            >
              Reabrir
            </button>
          )}
          {status === 'entregue' && (
            <button
              className="btn btn-sm"
              disabled={isInFlight}
              onClick={() => {
                setContaMsg(null);
                void gerarContaManual(pedido).then((msg) => setContaMsg(msg));
              }}
              data-testid="pedido-detail-gerar-conta"
            >
              {isInFlight ? '...' : 'Gerar A Receber'}
            </button>
          )}
        </div>
        {contaMsg && (
          <div
            className={`bdg ${contaMsg.startsWith('Conta') ? 'bg' : 'br'}`}
            style={{ marginTop: '0.5rem', display: 'block', padding: '0.5rem' }}
          >
            {contaMsg}
          </div>
        )}
      </div>
    </div>
  );
}
