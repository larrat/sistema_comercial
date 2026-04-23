import { useEffect, useRef } from 'react';
import { useProdutoStore } from '../store/useProdutoStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { listProdutos } from '../services/produtosApi';

export type UseProdutoDataOptions = {
  skip?: boolean;
};

export function useProdutoData(options: UseProdutoDataOptions = {}) {
  const { skip = false } = options;

  const setProdutos = useProdutoStore((s) => s.setProdutos);
  const setStatus = useProdutoStore((s) => s.setStatus);

  const session = useAuthStore((s) => s.session);
  const authStatus = useAuthStore((s) => s.status);
  const filialId = useFilialStore((s) => s.filialId);

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (skip) return;
    if (authStatus === 'unknown') return;
    if (authStatus === 'unauthenticated' || !session?.access_token) {
      setStatus('error', 'Sessão expirada. Faça login novamente.');
      return;
    }
    if (!filialId) {
      setStatus('error', 'Nenhuma filial selecionada.');
      return;
    }

    const { url, key, ready } = getSupabaseConfig();
    if (!ready) {
      setStatus('error', 'Configuração do Supabase ausente.');
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    setStatus('loading');

    listProdutos({ url, key, token: session.access_token, filialId })
      .then((data) => setProdutos(data))
      .catch((err: unknown) => {
        fetchedRef.current = false;
        setStatus('error', err instanceof Error ? err.message : 'Erro ao carregar produtos.');
      });
  }, [skip, authStatus, session, filialId, setProdutos, setStatus]);

  function reload() {
    fetchedRef.current = false;
    setStatus('loading');
    if (!session?.access_token || !filialId) return;
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) return;
    fetchedRef.current = true;
    listProdutos({ url, key, token: session.access_token, filialId })
      .then((data) => setProdutos(data))
      .catch((err: unknown) => {
        fetchedRef.current = false;
        setStatus('error', err instanceof Error ? err.message : 'Erro ao recarregar produtos.');
      });
  }

  return { reload };
}
