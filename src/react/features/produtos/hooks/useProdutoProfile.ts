import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Produto } from '../../../../types/domain';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { listProdutoById, listProdutoPais } from '../services/produtosApi';
import type { ProdutoSaldo } from '../types';

export function useProdutoProfile(produtoId?: string | null) {
  const session = useAuthStore((s) => s.session);
  const authStatus = useAuthStore((s) => s.status);
  const filialId = useFilialStore((s) => s.filialId);
  const [produto, setProduto] = useState<Produto | null>(null);
  const [pais, setPais] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const context = useMemo(() => {
    if (!session?.access_token || !filialId) return null;
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) return null;
    return { url, key, token: session.access_token, filialId };
  }, [filialId, session?.access_token]);

  const reload = useCallback(async () => {
    if (authStatus === 'unknown') return;
    if (!produtoId) {
      setError('Produto não informado.');
      setProduto(null);
      return;
    }
    if (authStatus === 'unauthenticated' || !session?.access_token) {
      setError('Sessão expirada. Faça login novamente.');
      setProduto(null);
      return;
    }
    if (!filialId) {
      setError('Nenhuma filial selecionada.');
      setProduto(null);
      return;
    }
    if (!context) {
      setError('Configuração do Supabase ausente.');
      setProduto(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [nextProduto, nextPais] = await Promise.all([
        listProdutoById(context, produtoId),
        listProdutoPais(context)
      ]);
      setProduto(nextProduto);
      setPais(nextPais);
      if (!nextProduto) setError('Produto não encontrado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar produto.');
      setProduto(null);
    } finally {
      setLoading(false);
    }
  }, [authStatus, context, filialId, produtoId, session?.access_token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saldo: ProdutoSaldo = useMemo(
    () => ({ saldo: Number(produto?.esal || 0), cm: Number(produto?.ecm || produto?.custo || 0) }),
    [produto]
  );

  return { produto, pais, saldo, loading, error, reload, setProduto };
}
