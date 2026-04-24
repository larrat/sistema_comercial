import { useRef, useState } from 'react';
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
  const applyPrecos = useCotacaoStore((s) => s.applyPrecos);
  const config = useCotacaoStore((s) => s.config);
  const ctx = useCtx();
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({});
  const [errorCells, setErrorCells] = useState<Record<string, string | null>>({});
  const seqRef = useRef<Record<string, number>>({});

  function clonePrecos(
    source: ReturnType<typeof useCotacaoStore.getState>['precos']
  ) {
    const next = { ...source };
    Object.keys(next).forEach((produtoId) => {
      next[produtoId] = { ...next[produtoId] };
    });
    return next;
  }

  async function atualizarPreco(produtoId: string, fornecedorId: string, valor: string) {
    if (config?.locked) {
      emitToast('A cotacao esta travada para edicao.', 'warning');
      return;
    }

    const key = `${produtoId}:${fornecedorId}`;
    const currentPrecos = useCotacaoStore.getState().precos;
    const prev = clonePrecos(currentPrecos);
    const v = parseFloat(valor.replace(',', '.'));
    const novo = clonePrecos(currentPrecos);
    if (!novo[produtoId]) novo[produtoId] = {};
    seqRef.current[key] = (seqRef.current[key] || 0) + 1;
    const seq = seqRef.current[key];
    setSavingCells((state) => ({ ...state, [key]: true }));
    setErrorCells((state) => ({ ...state, [key]: null }));

    if (!isNaN(v) && v > 0) {
      novo[produtoId][fornecedorId] = v;
      applyPrecos(novo);
      try {
        await upsertCotacaoPrecos(ctx, [
          { filial_id: ctx.filialId, produto_id: produtoId, fornecedor_id: fornecedorId, preco: v }
        ]);
        if (seqRef.current[key] === seq) {
          setSavingCells((state) => ({ ...state, [key]: false }));
        }
      } catch (err) {
        if (seqRef.current[key] !== seq) return;
        applyPrecos(prev);
        setSavingCells((state) => ({ ...state, [key]: false }));
        setErrorCells((state) => ({
          ...state,
          [key]: err instanceof Error ? err.message : 'Erro ao salvar preco.'
        }));
        emitToast('Erro ao salvar preço.', 'error');
      }
    } else {
      delete novo[produtoId]?.[fornecedorId];
      if (novo[produtoId] && !Object.keys(novo[produtoId]).length) {
        delete novo[produtoId];
      }
      applyPrecos(novo);
      try {
        await deleteCotacaoPreco(ctx, produtoId, fornecedorId);
        if (seqRef.current[key] === seq) {
          setSavingCells((state) => ({ ...state, [key]: false }));
        }
      } catch (err) {
        if (seqRef.current[key] !== seq) return;
        applyPrecos(prev);
        setSavingCells((state) => ({ ...state, [key]: false }));
        setErrorCells((state) => ({
          ...state,
          [key]: err instanceof Error ? err.message : 'Erro ao remover preco.'
        }));
        emitToast('Erro ao remover preço.', 'error');
      }
    }
  }

  return { atualizarPreco, savingCells, errorCells };
}

export function useCotacaoConfigMutation() {
  const [saving, setSaving] = useState(false);
  const config = useCotacaoStore((s) => s.config);
  const setConfig = useCotacaoStore((s) => s.setConfig);
  const ctx = useCtx();

  async function toggleLock() {
    const current = config ?? { filial_id: ctx.filialId, locked: false, logs: [] };
    const next: CotacaoConfig = { ...current, locked: !current.locked };
    setConfig(next);
    setSaving(true);
    try {
      await upsertCotacaoConfig(ctx, next);
      emitToast(next.locked ? 'Cotação travada.' : 'Cotação destravada.', 'info');
    } catch (err) {
      setConfig(current);
      emitToast(err instanceof Error ? err.message : 'Erro ao salvar configuração.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return { toggleLock, saving };
}
