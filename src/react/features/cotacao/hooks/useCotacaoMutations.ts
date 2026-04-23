import { useState } from 'react';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { emitToast } from '../../../app/legacy/events';
import {
  upsertFornecedor,
  deleteFornecedor,
  upsertCotacaoPrecos,
  deleteCotacaoPreco,
  upsertCotacaoConfig
} from '../services/cotacaoApi';
import { useCotacaoStore } from '../store/useCotacaoStore';
import type { CotacaoConfig } from '../types';

function useCtx() {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId) ?? '';
  const cfg = getSupabaseConfig();
  return {
    url: cfg.url,
    key: cfg.key,
    token: session?.access_token ?? '',
    filialId
  };
}

export function useFornecedorMutations() {
  const [saving, setSaving] = useState(false);
  const fornModal = useCotacaoStore((s) => s.fornModal);
  const closeFornModal = useCotacaoStore((s) => s.closeFornModal);
  const requestReload = useCotacaoStore((s) => s.requestReload);
  const ctx = useCtx();

  async function salvarFornecedor() {
    const { nome, contato, prazo } = fornModal.draft;
    if (!nome.trim()) {
      emitToast('Informe o nome do fornecedor.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await upsertFornecedor(ctx, {
        id: crypto.randomUUID(),
        filial_id: ctx.filialId,
        nome: nome.trim(),
        contato: contato.trim() || undefined,
        prazo: prazo.trim() || undefined
      });
      closeFornModal();
      requestReload();
      emitToast('Fornecedor salvo.', 'success');
    } catch (err) {
      emitToast(err instanceof Error ? err.message : 'Erro ao salvar fornecedor.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function removerFornecedor(id: string) {
    if (!window.confirm('Remover fornecedor?')) return;
    try {
      await deleteFornecedor(ctx, id);
      requestReload();
      emitToast('Fornecedor removido.', 'success');
    } catch (err) {
      emitToast(err instanceof Error ? err.message : 'Erro ao remover fornecedor.', 'error');
    }
  }

  return { saving, salvarFornecedor, removerFornecedor };
}

export function usePrecoCotacaoMutation() {
  const precos = useCotacaoStore((s) => s.precos);
  const setPrecos = useCotacaoStore((s) => s.setPrecos);
  const ctx = useCtx();

  async function atualizarPreco(produtoId: string, fornecedorId: string, valor: string) {
    const v = parseFloat(valor.replace(',', '.'));
    const novo = { ...precos };
    if (!novo[produtoId]) novo[produtoId] = {};

    if (!isNaN(v) && v > 0) {
      novo[produtoId][fornecedorId] = v;
      setPrecos(novo);
      try {
        await upsertCotacaoPrecos(ctx, [
          { filial_id: ctx.filialId, produto_id: produtoId, fornecedor_id: fornecedorId, preco: v }
        ]);
      } catch {
        // revert
        const revert = { ...precos };
        setPrecos(revert);
        emitToast('Erro ao salvar preço.', 'error');
      }
    } else {
      delete novo[produtoId]?.[fornecedorId];
      setPrecos(novo);
      try {
        await deleteCotacaoPreco(ctx, produtoId, fornecedorId);
      } catch {
        setPrecos(precos);
        emitToast('Erro ao remover preço.', 'error');
      }
    }
  }

  return { atualizarPreco };
}

export function useCotacaoConfigMutation() {
  const config = useCotacaoStore((s) => s.config);
  const setConfig = useCotacaoStore((s) => s.setConfig);
  const ctx = useCtx();

  async function toggleLock() {
    const current = config ?? { filial_id: ctx.filialId, locked: false, logs: [] };
    const next: CotacaoConfig = { ...current, locked: !current.locked };
    setConfig(next);
    try {
      await upsertCotacaoConfig(ctx, next);
      emitToast(next.locked ? 'Cotação travada.' : 'Cotação destravada.', 'info');
    } catch (err) {
      setConfig(current);
      emitToast(err instanceof Error ? err.message : 'Erro ao salvar configuração.', 'error');
    }
  }

  return { toggleLock };
}
