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
          <div className="flex flex-wrap items-center justify-end gap-3 lg:gap-6 mt-4 lg:mt-0 w-full lg:w-auto">
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
