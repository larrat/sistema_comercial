import { useEffect, useRef } from 'react';
import { usePedidoStore } from '../store/usePedidoStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { listPedidosPage, listPedidosSummary } from '../services/pedidosApi';

export type UsePedidoDataOptions = {
  skip?: boolean;
};

export function usePedidoData(options: UsePedidoDataOptions = {}) {
  const { skip = false } = options;

  const setPedidosPage = usePedidoStore((s) => s.setPedidosPage);
  const setSummary = usePedidoStore((s) => s.setSummary);
  const setStatus = usePedidoStore((s) => s.setStatus);
  const activeTab = usePedidoStore((s) => s.activeTab);
  const filtro = usePedidoStore((s) => s.filtro);
  const page = usePedidoStore((s) => s.page);
  const pageSize = usePedidoStore((s) => s.pageSize);

  const session = useAuthStore((s) => s.session);
  const authStatus = useAuthStore((s) => s.status);
  const filialId = useFilialStore((s) => s.filialId);

  const fetchedRef = useRef(false);
  const summaryRef = useRef(false);
  const lastRequestIdRef = useRef(0);

  useEffect(() => {
    fetchedRef.current = false;
    summaryRef.current = false;
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

    listPedidosPage(context, {
      page,
      pageSize,
      tab: activeTab,
      q: filtro.q,
      status: filtro.status,
      pgto: filtro.pgto,
      periodo: filtro.periodo,
      sort: filtro.sort
    })
      .then((result) => {
        if (requestId !== lastRequestIdRef.current) return;
        setPedidosPage({
          pedidos: result.rows,
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          pageCount: result.pageCount
        });
      })
      .catch((err: unknown) => {
        if (requestId !== lastRequestIdRef.current) return;
        fetchedRef.current = false;
        setStatus('error', err instanceof Error ? err.message : 'Erro ao carregar pedidos.');
      });
  }

  function loadSummary() {
    if (summaryRef.current) return;
    const context = resolveContext();
    if (!context) return;
    summaryRef.current = true;
    listPedidosSummary(context)
      .then((result) => setSummary(result))
      .catch(() => {
        summaryRef.current = false;
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
    loadSummary();
  }, [
    skip,
    authStatus,
    session,
    filialId,
    activeTab,
    filtro.q,
    filtro.status,
    filtro.pgto,
    filtro.periodo,
    filtro.sort,
    page,
    pageSize,
    setPedidosPage,
    setStatus
  ]);

  function reload() {
    fetchedRef.current = true;
    summaryRef.current = false;
    loadPage();
    loadSummary();
  }

  return { reload };
}
