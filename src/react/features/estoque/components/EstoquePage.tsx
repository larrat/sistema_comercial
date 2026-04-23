import { EmptyState, FormSection } from '../../../shared/ui';
import { useFilialContext } from '../../../app/filial/FilialProvider';
import { useEstoqueFilters } from '../hooks/useEstoqueFilters';
import { useEstoqueStore } from '../store/useEstoqueStore';
import { EstoqueFilters } from './EstoqueFilters';
import { EstoqueHistoryTable } from './EstoqueHistoryTable';
import { EstoqueMetrics } from './EstoqueMetrics';
import { EstoquePageHeader } from './EstoquePageHeader';
import { EstoquePositionTable } from './EstoquePositionTable';

export function EstoquePage() {
  const { filialId } = useFilialContext();
  const { view } = useEstoqueFilters();
  const metrics = useEstoqueStore((s) => s.metrics);
  const positionRows = useEstoqueStore((s) => s.positionRows);
  const historyRows = useEstoqueStore((s) => s.historyRows);
  const status = useEstoqueStore((s) => s.status);
  const error = useEstoqueStore((s) => s.error);

  return (
    <main className="rf-content rf-ui-stack">
      <EstoquePageHeader filialId={filialId} />
      <EstoqueMetrics metrics={metrics} />
      <EstoqueFilters />

      {status === 'error' && error ? <EmptyState title={error} compact /> : null}

      <FormSection
        title={view === 'posicao' ? 'Posição de estoque' : 'Histórico de movimentações'}
        description={
          view === 'posicao'
            ? 'Primeira base React do módulo. A listagem real será portada em seguida.'
            : 'Estrutura pronta para migrar o histórico sem depender do shell legado.'
        }
      >
        {view === 'posicao' ? (
          <EstoquePositionTable rows={positionRows} />
        ) : (
          <EstoqueHistoryTable rows={historyRows} />
        )}
      </FormSection>
    </main>
  );
}
