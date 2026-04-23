import { EmptyState, FormSection } from '../../../shared/ui';
import { useFilialContext } from '../../../app/filial/FilialProvider';
import { useEstoqueFilters } from '../hooks/useEstoqueFilters';
import { useEstoqueStore } from '../store/useEstoqueStore';
import { EstoqueFilters } from './EstoqueFilters';
import { EstoqueHistoryTable } from './EstoqueHistoryTable';
import { EstoqueMovementModal } from './EstoqueMovementModal';
import { EstoqueMetrics } from './EstoqueMetrics';
import { EstoquePageHeader } from './EstoquePageHeader';
import { EstoquePositionTable } from './EstoquePositionTable';

export function EstoquePage() {
  const { filialId } = useFilialContext();
  const { view, positionRows, historyRows } = useEstoqueFilters();
  const metrics = useEstoqueStore((s) => s.metrics);
  const status = useEstoqueStore((s) => s.status);
  const error = useEstoqueStore((s) => s.error);
  const openMovementModal = useEstoqueStore((s) => s.openMovementModal);

  return (
    <main className="rf-content rf-ui-stack">
      <EstoquePageHeader filialId={filialId} onCreateMovement={() => openMovementModal()} />
      <EstoqueMetrics metrics={metrics} />
      <EstoqueFilters />

      {status === 'error' && error ? <EmptyState title={error} compact /> : null}

      <FormSection
        title={view === 'posicao' ? 'Posição de estoque' : 'Histórico de movimentações'}
        description={
          view === 'posicao'
            ? 'Listagem principal portada para React com filtros e leitura real de produtos e movimentações.'
            : 'Estrutura pronta para migrar o histórico sem depender do shell legado.'
        }
      >
        {status === 'loading' ? (
          <EmptyState
            title="Carregando posição de estoque..."
            description="Estamos consolidando produtos e movimentações da filial atual."
            compact
          />
        ) : null}

        {status !== 'loading' && view === 'posicao' ? (
          <EstoquePositionTable
            rows={positionRows}
            totalProdutos={metrics.produtos}
            onMoveProduct={(row) => openMovementModal(row.id)}
          />
        ) : null}

        {status !== 'loading' && view === 'historico' ? (
          <EstoqueHistoryTable rows={historyRows} />
        ) : null}
      </FormSection>
      <EstoqueMovementModal />
    </main>
  );
}
