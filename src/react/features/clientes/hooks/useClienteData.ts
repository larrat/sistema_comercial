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
import { listClientes } from '../services/clientesApi';

export type UseClienteDataOptions = {
  /** Não dispara o fetch automaticamente — útil para testes */
  skip?: boolean;
};

export function useClienteData(options: UseClienteDataOptions = {}) {
  const { skip = false } = options;

  const setClientes = useClienteStore((s) => s.setClientes);
  const setStatus = useClienteStore((s) => s.setStatus);

  const session = useAuthStore((s) => s.session);
  const authStatus = useAuthStore((s) => s.status);
  const filialId = useFilialStore((s) => s.filialId);

  // evita fetch duplo em StrictMode (double-effect)
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

    listClientes({ url, key, token: session.access_token, filialId })
      .then((data) => setClientes(data))
      .catch((err: unknown) => {
        fetchedRef.current = false; // permite retry
        setStatus('error', err instanceof Error ? err.message : 'Erro ao carregar clientes.');
      });
  }, [skip, authStatus, session, filialId, setClientes, setStatus]);

  /** Força novo fetch (ex: após salvar/excluir cliente) */
  function reload() {
    fetchedRef.current = false;
    setStatus('loading');
    if (!session?.access_token || !filialId) return;
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) return;
    fetchedRef.current = true;
    listClientes({ url, key, token: session.access_token, filialId })
      .then((data) => setClientes(data))
      .catch((err: unknown) => {
        fetchedRef.current = false;
        setStatus('error', err instanceof Error ? err.message : 'Erro ao recarregar clientes.');
      });
  }

  return { reload };
}
