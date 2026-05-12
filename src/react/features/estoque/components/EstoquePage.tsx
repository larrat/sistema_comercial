import { useState } from 'react';

import { ErrorState, FormSection, LoadingState } from '../../../shared/ui';
import { useFilialContext } from '../../../app/filial/FilialProvider';
import { useEstoqueFilters } from '../hooks/useEstoqueFilters';
import { useEstoqueMutations } from '../hooks/useEstoqueMutations';
import { useEstoqueStore } from '../store/useEstoqueStore';
import type { EstoqueHistoryRow } from '../types';
import { EstoqueDeleteConfirmModal } from './EstoqueDeleteConfirmModal';
import { EstoqueFilters } from './EstoqueFilters';
import { EstoqueHistoryTable } from './EstoqueHistoryTable';
import { EstoqueMovementModal } from './EstoqueMovementModal';
import { EstoqueMetrics } from './EstoqueMetrics';
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

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex flex-col gap-6">
      <EstoquePageHeader
        filialId={filialId}
        onCreateMovement={() => openMovementModal()}
        onReload={requestReload}
      />
      <EstoqueMetrics metrics={metrics} />
      <EstoqueFilters />

      {status === 'error' && error ? (
        <ErrorState
          title={error}
          description="Revise a filial ativa, a sessão ou tente recarregar os dados do estoque."
          onRetry={requestReload}
          compact
        />
      ) : null}

      <FormSection
        title={view === 'posicao' ? 'Posição de estoque' : 'Histórico de movimentações'}
      >
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
      </FormSection>
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
    </main>
  );
}
