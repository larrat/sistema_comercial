import { validateMovimentacao } from '../../../../core/validators/index.js';
import { emitToast } from '../../../app/legacy/events';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import type { MovimentoEstoque } from '../../../../types/domain';
import { insertMovimentacao } from '../services/estoqueApi';
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

  async function saveMovement(currentSaldo = 0): Promise<boolean> {
    const token = session?.access_token || '';
    const config = getSupabaseConfig();

    if (!filialId || !token || !config.ready) {
      emitToast('Sessão ou filial indisponível para salvar movimentação.', 'error');
      return false;
    }

    const quantidade = toNumber(draft.quantidade);
    const custo = toNumber(draft.custo);
    const saldoReal = toNumber(draft.saldoReal);

    if (draft.tipo === 'saida' && quantidade > currentSaldo) {
      const confirmed = window.confirm(
        `Saldo atual: ${currentSaldo}. Registrar a saída assim mesmo?`
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

      closeMovementModal();
      requestReload();
      emitToast('Movimentação registrada.', 'success');
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível registrar a movimentação.';
      emitToast(message, 'error');
      return false;
    }
  }

  return {
    saveMovement
  };
}
