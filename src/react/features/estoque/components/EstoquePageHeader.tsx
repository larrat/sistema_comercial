import { PageHeader, StatusBadge } from '../../../shared/ui';

type EstoquePageHeaderProps = {
  filialId: string | null;
  onCreateMovement: () => void;
};

export function EstoquePageHeader({ filialId, onCreateMovement }: EstoquePageHeaderProps) {
  return (
    <PageHeader
      kicker="Estoque"
      title="Estoque"
      description="Posição principal de estoque já roda no shell React. Histórico e movimentação seguem em migração gradual."
      actions={
        <button type="button" className="btn btn-p btn-sm" onClick={onCreateMovement}>
          Nova movimentação
        </button>
      }
      meta={<StatusBadge tone="info">{filialId || 'Sem filial'}</StatusBadge>}
    />
  );
}
