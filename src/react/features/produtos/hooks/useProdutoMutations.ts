import { useState } from 'react';
import type { Produto } from '../../../../types/domain';
import { useToastStore } from '../../../app/lib/useToastStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useProdutoStore } from '../store/useProdutoStore';
import {
  saveProduto,
  deleteProduto,
  cascadeRenameProduto,
  cascadeUpdateFilhos
} from '../services/produtosApi';
import type { ProdutoWriteInput } from '../types';

export function useProdutoMutations() {
  const upsertProduto = useProdutoStore((s) => s.upsertProduto);
  const removeProduto = useProdutoStore((s) => s.removeProduto);
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resolveContext() {
    if (!session?.access_token) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (!filialId) {
      throw new Error('Nenhuma filial selecionada.');
    }
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) {
      throw new Error('Configuração do Supabase ausente.');
    }
    return { url, key, token: session.access_token, filialId };
  }

  async function submitProduto(input: ProdutoWriteInput): Promise<Produto> {
    const context = resolveContext();
    setSaving(true);
    setError(null);

    try {
      const saved = await saveProduto(context, input);
      const normalized =
        saved ??
        ({
          ...input,
          id: input.id ?? crypto.randomUUID(),
          filial_id: context.filialId
        } as Produto);
      upsertProduto(normalized);
      useToastStore
        .getState()
        .addToast(
          input.id ? 'Produto atualizado com sucesso.' : 'Produto salvo com sucesso.',
          'success'
        );
      return normalized;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar produto.';
      setError(message);
      useToastStore.getState().addToast(message, 'error');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function deleteProdutoById(produtoId: string): Promise<void> {
    const context = resolveContext();
    setDeletingId(produtoId);
    setError(null);

    try {
      await deleteProduto(context, produtoId);
      removeProduto(produtoId);
      useToastStore.getState().addToast('Produto removido.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover produto.';
      setError(message);
      useToastStore.getState().addToast(message, 'error');
      throw err;
    } finally {
      setDeletingId(null);
    }
  }

  async function submitCascadeFilhos(paiId: string, data: Partial<Produto>): Promise<void> {
    const context = resolveContext();
    try {
      await cascadeUpdateFilhos(context, paiId, data);
    } catch (err) {
      console.error('[mutations] Falha no cascade filhos:', err);
    }
  }

  return {
    submitProduto,
    submitCascadeRename,
    submitCascadeFilhos,
    deleteProdutoById,
    saving,
    deletingId,
    error
  };
}
