import { PageHeader, StatusBadge } from '../../../shared/ui';

type EstoquePageHeaderProps = {
  filialId: string | null;
};

export function EstoquePageHeader({ filialId }: EstoquePageHeaderProps) {
  return (
    <PageHeader
      kicker="Estoque"
      title="Estoque"
      description="Base React criada para migrar posição, histórico e movimentação de estoque em partes."
      meta={<StatusBadge tone="info">{filialId || 'Sem filial'}</StatusBadge>}
    />
  );
}
