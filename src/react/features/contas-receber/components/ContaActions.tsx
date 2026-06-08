import type { ContaReceber, ContaReceberBaixa } from '../../../../types/domain';
import { Button } from '../../../shared/ui';
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
      <Button size="sm" onClick={onDesfazer}>
        Desfazer recebimento
      </Button>
    );
  }

  return (
    <div className="fg2">
      <Button size="sm" onClick={onBaixaParcial}>
        Baixa parcial
      </Button>
      <Button size="sm" variant="primary" onClick={onReceber}>
        Receber tudo
      </Button>
    </div>
  );
}
