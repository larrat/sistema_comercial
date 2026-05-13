import { PageHeader, StatusBadge, Button } from '../../../shared/ui';

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
            <Button onClick={onReload}>
              Atualizar
            </Button>
          ) : null}
          <Button variant="primary" onClick={onCreateMovement}>
            Nova movimentação
          </Button>
        </div>
      }
    />
  );
}
