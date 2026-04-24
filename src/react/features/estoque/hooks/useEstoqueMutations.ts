import { validateMovimentacao } from '../../../../core/validators/index.js';
import { emitToast } from '../../../app/legacy/events';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import type { MovimentoEstoque } from '../../../../types/domain';
import {
  deleteMovimentacao,
  insertMovimentacao,
  transferMovimentacao
} from '../services/estoqueApi';
import { useEstoqueStore } from '../store/useEstoqueStore';

function toNumber(value: string): number {
  const normalized = String(value || '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function useEstoqueMutations() {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const draft = useEstoqueStore((s) => s.movementDraft);
  const closeMovementModal = useEstoqueStore((s) => s.closeMovementModal);
  const requestReload = useEstoqueStore((s) => s.requestReload);

  async function saveMovement(currentSaldo = 0, currentCm = 0): Promise<boolean> {
    const token = session?.access_token || '';
    const config = getSupabaseConfig();

    if (!filialId || !token || !config.ready) {
      emitToast('Sessão ou filial indisponível para salvar movimentação.', 'error');
      return false;
    }

    const quantidade = toNumber(draft.quantidade);
    const custo = toNumber(draft.custo);
    const saldoReal = toNumber(draft.saldoReal);

    if ((draft.tipo === 'saida' || draft.tipo === 'transf') && quantidade > currentSaldo) {
      const confirmed = window.confirm(
        `Saldo atual: ${currentSaldo}. Registrar ${draft.tipo === 'transf' ? 'a transferência' : 'a saída'} assim mesmo?`
      );
      if (!confirmed) return false;
    }

    try {
      const validated = validateMovimentacao({
        prod_id: draft.produtoId,
        tipo: draft.tipo,
        qty: quantidade,
        saldo_real: saldoReal
      });

      if (draft.tipo === 'transf') {
        const destinationFilialId = String(draft.destinoFilialId || '').trim();
        if (!destinationFilialId) {
          emitToast('Selecione a filial de destino para concluir a transferência.', 'error');
          return false;
        }

        if (destinationFilialId === filialId) {
          emitToast('A filial de destino precisa ser diferente da filial atual.', 'error');
          return false;
        }

        const transferTs = Date.now();
        const transferNote = draft.observacao.trim();

        await transferMovimentacao(
          {
            url: config.url,
            key: config.key,
            token,
            filialId
          },
          {
            destinationFilialId,
            originMovement: {
              id: `${transferTs}-origem-${Math.random().toString(36).slice(2, 8)}`,
              filial_id: filialId,
              prod_id: draft.produtoId,
              tipo: 'transf',
              data: draft.data,
              obs: transferNote,
              ts: transferTs,
              custo: 0,
              destino: destinationFilialId,
              ...(validated.qty !== undefined ? { qty: validated.qty } : {})
            },
            destinationMovement: {
              id: `${transferTs}-destino-${Math.random().toString(36).slice(2, 8)}`,
              filial_id: destinationFilialId,
              prod_id: draft.produtoId,
              tipo: 'entrada',
              data: draft.data,
              obs:
                transferNote ||
                `Transferência recebida da filial ${filialId}`,
              ts: transferTs,
              custo: currentCm,
              ...(validated.qty !== undefined ? { qty: validated.qty } : {})
            }
          }
        );
      } else {
        const movement: MovimentoEstoque = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          filial_id: filialId,
          prod_id: draft.produtoId,
          tipo: draft.tipo,
          data: draft.data,
          obs: draft.observacao.trim(),
          ts: Date.now(),
          custo: draft.tipo === 'entrada' ? custo : 0,
          ...(validated.qty !== undefined ? { qty: validated.qty } : {}),
          ...(validated.saldo_real !== undefined ? { saldo_real: validated.saldo_real } : {})
        };

        await insertMovimentacao(
          {
            url: config.url,
            key: config.key,
            token,
            filialId
          },
          movement
        );
      }

      closeMovementModal();
      requestReload();
      emitToast(
        draft.tipo === 'transf' ? 'Transferência registrada.' : 'Movimentação registrada.',
        'success'
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : draft.tipo === 'transf'
            ? 'Não foi possível concluir a transferência.'
            : 'Não foi possível registrar a movimentação.';
      emitToast(message, 'error');
      return false;
    }
  }

  async function deleteMovement(movementId: string): Promise<boolean> {
    const token = session?.access_token || '';
    const config = getSupabaseConfig();

    if (!filialId || !token || !config.ready) {
      emitToast('Sessão ou filial indisponível para excluir movimentação.', 'error');
      return false;
    }

    try {
      await deleteMovimentacao(
        {
          url: config.url,
          key: config.key,
          token,
          filialId
        },
        movementId
      );

      requestReload();
      emitToast('Movimentação excluída.', 'success');
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível excluir a movimentação.';
      emitToast(message, 'error');
      return false;
    }
  }

  return {
    saveMovement,
    deleteMovement
  };
}
