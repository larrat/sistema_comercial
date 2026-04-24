import { useState } from 'react';

import { EmptyState, FormSection } from '../../../shared/ui';
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
