import type { ContaReceber, ContaReceberBaixa } from '../../../../types/domain';
import { Modal, StatCard } from '../../../shared/ui';
import { getValorEmAberto, getValorRecebido, getStatusLabel } from '../hooks/useContasReceberMutations';
import { fmt } from './ContasReceberUtils';
import { ContaActions } from './ContaActions';
import { BaixaHistorico } from './BaixaHistorico';

export type ContaDetailModalProps = {
  conta: ContaReceber | null;
  baixas: ContaReceberBaixa[];
  inFlight: boolean;
  open: boolean;
  onClose: () => void;
  onReceber: () => void;
  onBaixaParcial: () => void;
  onDesfazer: () => void;
  onEstornar: (contaId: string, baixaId: string) => void;
};

export function ContaDetailModal({
  conta,
  baixas,
  inFlight,
  open,
  onClose,
  onReceber,
  onBaixaParcial,
  onDesfazer,
  onEstornar
}: ContaDetailModalProps) {
  if (!conta) return null;

  const recebido = getValorRecebido(conta);
  const aberto = getValorEmAberto(conta);

  return (
    <Modal
      open={open}
      title={conta.cliente}
      subtitle={[
        conta.pedido_num ? `Pedido #${conta.pedido_num}` : null,
        `Vencimento ${conta.vencimento}`,
        getStatusLabel(conta)
      ]
        .filter(Boolean)
        .join(' · ')}
      onClose={onClose}
    >
      <div className="rf-ui-stack">
        <div className="rf-ui-stat-grid--3">
          <StatCard label="Total" value={fmt(conta.valor)} />
          <StatCard label="Recebido" value={fmt(recebido)} tone="success" />
          <StatCard label="Em aberto" value={fmt(aberto)} tone={aberto > 0 ? 'warning' : 'success'} />
        </div>

        <div className="rf-ui-stack" style={{ gap: 8 }}>
          <div className="table-cell-caption table-cell-muted">Ações da conta</div>
          <ContaActions
            cr={conta}
            inFlight={inFlight}
            onReceber={onReceber}
            onBaixaParcial={onBaixaParcial}
            onDesfazer={onDesfazer}
          />
        </div>

        <BaixaHistorico baixas={baixas} contaId={conta.id} onEstornar={onEstornar} />
      </div>
    </Modal>
  );
}
