import { PageHeader, StatusBadge } from '../../../shared/ui';

type EstoquePageHeaderProps = {
  onCreateMovement: () => void;
  onReload?: () => void;
};

export function EstoquePageHeader({ onCreateMovement, onReload }: EstoquePageHeaderProps) {
  return (
    <PageHeader
      kicker="Operação"
      title="Estoque"
      description="Acompanhe saldo, histórico e movimentos críticos por produto na filial ativa."
      actions={
        <div className="flex items-center gap-3">
          {onReload ? (
            <button type="button" className="btn btn-sm" onClick={onReload}>
              Atualizar
            </button>
          ) : null}
          <button type="button" className="btn btn-p btn-sm" onClick={onCreateMovement}>
            Nova movimentação
          </button>
        </div>
      }
    />
  );
}
