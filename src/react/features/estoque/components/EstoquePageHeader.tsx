import { PageHeader, StatusBadge } from '../../../shared/ui';

type EstoquePageHeaderProps = {
  filialId: string | null;
  onCreateMovement: () => void;
  onReload?: () => void;
};

export function EstoquePageHeader({ filialId, onCreateMovement, onReload }: EstoquePageHeaderProps) {
  return (
    <PageHeader
      kicker="Operação"
      title="Estoque"
      description="Acompanhe saldo, histórico e movimentos críticos por produto na filial ativa."
      actions={
        <>
          {onReload ? (
            <button type="button" className="btn btn-sm" onClick={onReload}>
              Atualizar
            </button>
          ) : null}
          <button type="button" className="btn btn-p btn-sm" onClick={onCreateMovement}>
            Nova movimentação
          </button>
        </>
      }
      meta={<StatusBadge tone="info">{filialId || 'Sem filial'}</StatusBadge>}
    />
  );
}
