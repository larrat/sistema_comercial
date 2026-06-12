import type { ContaReceber, ContaReceberBaixa } from '../../../../types/domain';
import { Button, ActionMenu } from '../../../shared/ui';
import { getStatusEfetivo } from '../hooks/useContasReceberMutations';

export type ContaActionsProps = {
  cr: ContaReceber;
  inFlight: boolean;
  onReceber: () => void;
  onBaixaParcial: () => void;
  onDesfazer: () => void;
};

export function ContaActions({ cr, inFlight, onReceber, onBaixaParcial, onDesfazer }: ContaActionsProps) {
  if (inFlight) {
    return <span className="table-cell-muted table-cell-caption">Salvando...</span>;
  }

  if (getStatusEfetivo(cr) === 'recebido') {
    return (
      <ActionMenu
        label="Ações"
        items={[
          { key: 'desfazer', label: 'Desfazer recebimento', onClick: onDesfazer }
        ]}
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={onBaixaParcial}>
        Parcial
      </Button>
      <Button size="sm" variant="primary" onClick={onReceber}>
        Receber
      </Button>
    </div>
  );
}
