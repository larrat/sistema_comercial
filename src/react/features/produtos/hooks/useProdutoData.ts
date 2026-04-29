import { useEffect, useRef } from 'react';
import { useProdutoStore } from '../store/useProdutoStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import {
  listProdutoCategorias,
  listProdutoPais,
  listProdutosPage
} from '../services/produtosApi';

export type UseProdutoDataOptions = {
  skip?: boolean;
};

export function useProdutoData(options: UseProdutoDataOptions = {}) {
  const { skip = false } = options;

  const setProdutosPage = useProdutoStore((s) => s.setProdutosPage);
  const setStatus = useProdutoStore((s) => s.setStatus);
  const setCategorias = useProdutoStore((s) => s.setCategorias);
  const setParentProdutos = useProdutoStore((s) => s.setParentProdutos);
  const setAuxStatus = useProdutoStore((s) => s.setAuxStatus);
  const filtro = useProdutoStore((s) => s.filtro);
  const page = useProdutoStore((s) => s.page);
  const pageSize = useProdutoStore((s) => s.pageSize);

  const session = useAuthStore((s) => s.session);
  const authStatus = useAuthStore((s) => s.status);
  const filialId = useFilialStore((s) => s.filialId);

  const fetchedRef = useRef(false);
  const auxFetchedRef = useRef(false);
  const lastRequestIdRef = useRef(0);

  useEffect(() => {
    fetchedRef.current = false;
    auxFetchedRef.current = false;
    lastRequestIdRef.current = 0;
  }, [filialId, session?.access_token]);

  function resolveContext() {
    if (!session?.access_token || !filialId) return null;
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) return null;
    return { url, key, token: session.access_token, filialId };
  }

  function loadPage() {
    const context = resolveContext();
    if (!context) return;
    const requestId = ++lastRequestIdRef.current;
    setStatus('loading');

    listProdutosPage(context, {
      page,
      pageSize,
      q: filtro.q,
      cat: filtro.cat
    })
      .then((result) => {
        if (requestId !== lastRequestIdRef.current) return;
        setProdutosPage({
          produtos: result.rows,
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          pageCount: result.pageCount
        });
      })
      .catch((err: unknown) => {
        if (requestId !== lastRequestIdRef.current) return;
        fetchedRef.current = false;
        setStatus('error', err instanceof Error ? err.message : 'Erro ao carregar produtos.');
      });
  }

  function loadAuxiliary() {
    if (auxFetchedRef.current) return;
    const context = resolveContext();
    if (!context) return;
    auxFetchedRef.current = true;
    setAuxStatus('loading');
    Promise.all([listProdutoCategorias(context), listProdutoPais(context)])
      .then(([categorias, parentProdutos]) => {
        setCategorias(categorias);
        setParentProdutos(parentProdutos);
        setAuxStatus('ready');
      })
      .catch((err: unknown) => {
        auxFetchedRef.current = false;
        setAuxStatus(
          'error',
          err instanceof Error ? err.message : 'Erro ao carregar dados auxiliares de produtos.'
        );
      });
  }

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

    if (!resolveContext()) {
      setStatus('error', 'Configuração do Supabase ausente.');
      return;
    }
    fetchedRef.current = true;
    loadPage();
    loadAuxiliary();
  }, [skip, authStatus, session, filialId, filtro.q, filtro.cat, page, pageSize, setStatus]);

  function reload() {
    fetchedRef.current = true;
    loadPage();
  }

  return { reload };
}
