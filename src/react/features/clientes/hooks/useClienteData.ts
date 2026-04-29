/**
 * Hook que carrega clientes da API Supabase e popula o useClienteStore.
 *
 * Usa a mesma URL/key/auth do legado via getSupabaseConfig e getAccessToken.
 * Não depende de nenhum módulo do legado — só dos stores e da config compartilhada.
 */

import { useEffect, useRef } from 'react';
import { useClienteStore } from '../store/useClienteStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import {
  listClienteSegmentos,
  listClientesFiltered,
  listClientesPage
} from '../services/clientesApi';

export type UseClienteDataOptions = {
  /** Não dispara o fetch automaticamente — útil para testes */
  skip?: boolean;
};

export function useClienteData(options: UseClienteDataOptions = {}) {
  const { skip = false } = options;

  const setClientesPage = useClienteStore((s) => s.setClientesPage);
  const setSegmentClientes = useClienteStore((s) => s.setSegmentClientes);
  const setSegmentos = useClienteStore((s) => s.setSegmentos);
  const setStatus = useClienteStore((s) => s.setStatus);
  const setSegmentStatus = useClienteStore((s) => s.setSegmentStatus);
  const filtro = useClienteStore((s) => s.filtro);
  const page = useClienteStore((s) => s.page);
  const pageSize = useClienteStore((s) => s.pageSize);

  const session = useAuthStore((s) => s.session);
  const authStatus = useAuthStore((s) => s.status);
  const filialId = useFilialStore((s) => s.filialId);

  // evita fetch duplo em StrictMode (double-effect)
  const fetchedRef = useRef(false);
  const segmentosRef = useRef(false);
  const lastRequestIdRef = useRef(0);

  useEffect(() => {
    fetchedRef.current = false;
    segmentosRef.current = false;
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

    listClientesPage(context, {
      page,
      pageSize,
      q: filtro.q,
      seg: filtro.seg,
      status: filtro.status
    })
      .then((result) => {
        if (requestId !== lastRequestIdRef.current) return;
        setClientesPage({
          clientes: result.rows,
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          pageCount: result.pageCount
        });
      })
      .catch((err: unknown) => {
        if (requestId !== lastRequestIdRef.current) return;
        fetchedRef.current = false;
        setStatus('error', err instanceof Error ? err.message : 'Erro ao carregar clientes.');
      });
  }

  function loadSegmentos() {
    if (segmentosRef.current) return;
    const context = resolveContext();
    if (!context) return;
    segmentosRef.current = true;
    listClienteSegmentos(context)
      .then((data) => setSegmentos(data))
      .catch(() => {
        segmentosRef.current = false;
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
    loadSegmentos();
  }, [
    skip,
    authStatus,
    session,
    filialId,
    filtro.q,
    filtro.seg,
    filtro.status,
    page,
    pageSize,
    setClientesPage,
    setSegmentos,
    setStatus
  ]);

  /** Força novo fetch (ex: após salvar/excluir cliente) */
  function reload() {
    fetchedRef.current = true;
    loadPage();
  }

  async function loadFilteredAll() {
    const context = resolveContext();
    if (!context) {
      throw new Error('Contexto de clientes indisponível.');
    }
    return listClientesFiltered(context, {
      q: filtro.q,
      seg: filtro.seg,
      status: filtro.status
    });
  }

  async function ensureSegmentClientes() {
    const context = resolveContext();
    if (!context) {
      throw new Error('Contexto de clientes indisponível.');
    }
    setSegmentStatus('loading');
    try {
      const data = await listClientesFiltered(context, {
        q: filtro.q,
        seg: filtro.seg,
        status: filtro.status
      });
      setSegmentClientes(data);
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao carregar agrupamento por segmento.';
      setSegmentStatus('error', message);
      throw err;
    }
  }

  return { reload, loadFilteredAll, ensureSegmentClientes };
}
