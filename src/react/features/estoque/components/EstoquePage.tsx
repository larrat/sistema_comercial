import { useState } from 'react';

import { ErrorState, FormSection, LoadingState } from '../../../shared/ui';
import { useFilialContext } from '../../../app/filial/FilialProvider';
import { useEstoqueFilters } from '../hooks/useEstoqueFilters';
import { useEstoqueMutations } from '../hooks/useEstoqueMutations';
import { useEstoqueStore } from '../store/useEstoqueStore';
import type { EstoqueHistoryRow } from '../types';
import { EstoqueDeleteConfirmModal } from './EstoqueDeleteConfirmModal';
import { EstoqueInlineFilters } from './EstoqueInlineFilters';
import { EstoqueHistoryTable } from './EstoqueHistoryTable';
import { EstoqueCoverageTable } from './EstoqueCoverageTable';
import { EstoqueIdleTable } from './EstoqueIdleTable';
import { EstoqueMovementModal } from './EstoqueMovementModal';
import { EstoqueMetrics } from './EstoqueMetrics';
import { EstoqueCharts } from './EstoqueCharts';
import { EstoquePageHeader } from './EstoquePageHeader';
import { EstoquePositionTable } from './EstoquePositionTable';

export function EstoquePage() {
  const { filialId } = useFilialContext();
  const { view, positionRows, historyRows } = useEstoqueFilters();
  const { deleteMovement } = useEstoqueMutations();
  const metrics = useEstoqueStore((s) => s.metrics);
  const status = useEstoqueStore((s) => s.status);
  const error = useEstoqueStore((s) => s.error);
  const openMovementModal = useEstoqueStore((s) => s.openMovementModal);
  const requestReload = useEstoqueStore((s) => s.requestReload);
  const [deletingRow, setDeletingRow] = useState<EstoqueHistoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!deletingRow || deleting) return;
    setDeleting(true);
    const success = await deleteMovement(deletingRow.id);
    setDeleting(false);
    if (success) {
      setDeletingRow(null);
    }
  }

  const viewTitle = 
    view === 'posicao' ? 'Posição de estoque' :
    view === 'historico' ? 'Histórico de movimentações' :
    view === 'cobertura' ? 'Cobertura de estoque' :
    'Produtos sem movimento';

  return (
    <div className="w-full flex flex-col gap-8">
      <EstoquePageHeader
        onCreateMovement={() => openMovementModal()}
        onReload={requestReload}
      />
      <EstoqueMetrics metrics={metrics} />
      
      {status !== 'loading' && positionRows.length > 0 ? (
        <EstoqueCharts />
      ) : null}

      {status === 'error' && error ? (
        <ErrorState
          title={error}
          description="Revise a filial ativa, a sessão ou tente recarregar os dados do estoque."
          onRetry={requestReload}
          compact
        />
      ) : null}

      {/* Main content card — tabs, filters, and table all unified */}
      <section className="rf-card-premium rf-ui-form-section">
        {/* Integrated header: tabs + filters */}
        <EstoqueInlineFilters />

        {/* Content body */}
        <div className="rf-ui-form-section__body mt-2">
          {status === 'loading' ? (
            <LoadingState
              title={view === 'posicao' ? 'Carregando posição de estoque...' : 'Carregando histórico...'}
              description={
                view === 'posicao'
                  ? 'Estamos atualizando os saldos e o valor estimado da filial.'
                  : 'Estamos reunindo as últimas movimentações registradas.'
              }
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
            <EstoqueHistoryTable
              rows={historyRows}
              deletingId={deleting ? deletingRow?.id ?? null : null}
              onDelete={setDeletingRow}
            />
          ) : null}

          {status !== 'loading' && view === 'cobertura' ? (
            <EstoqueCoverageTable rows={positionRows} />
          ) : null}

          {status !== 'loading' && view === 'sem_movimento' ? (
            <EstoqueIdleTable rows={positionRows} />
          ) : null}
        </div>
      </section>

      <EstoqueMovementModal />
      <EstoqueDeleteConfirmModal
        open={Boolean(deletingRow)}
        target={deletingRow}
        submitting={deleting}
        onClose={() => {
          if (deleting) return;
          setDeletingRow(null);
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
