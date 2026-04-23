import { useState } from 'react';
import type { Produto } from '../../../../types/domain';
import { emitLegacyEvent } from '../../../app/legacy/events';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useProdutoStore } from '../store/useProdutoStore';
import { saveProduto, deleteProduto } from '../services/produtosApi';
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
      const normalized = saved ?? ({
        ...input,
        id: input.id ?? crypto.randomUUID(),
        filial_id: context.filialId
      } as Produto);
      upsertProduto(normalized);
      emitLegacyEvent('sc:produto-salvo', normalized);
      return normalized;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar produto.';
      setError(message);
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
      emitLegacyEvent('sc:produto-removido', { id: produtoId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover produto.';
      setError(message);
      throw err;
    } finally {
      setDeletingId(null);
    }
  }

  return { submitProduto, deleteProdutoById, saving, deletingId, error };
}
