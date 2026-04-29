import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Cliente } from '../../../../types/domain';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useClienteStore } from '../store/useClienteStore';
import { getClienteById } from '../services/clientesApi';

type State = {
  cliente: Cliente | null;
  loading: boolean;
  error: string | null;
};

const EMPTY: State = {
  cliente: null,
  loading: false,
  error: null
};

export function useClienteProfile(clienteId?: string | null) {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const clientes = useClienteStore((s) => s.clientes);
  const segmentClientes = useClienteStore((s) => s.segmentClientes);

  const cachedCliente = useMemo(
    () => [...clientes, ...segmentClientes].find((cliente) => cliente.id === clienteId) ?? null,
    [clienteId, clientes, segmentClientes]
  );

  const [state, setState] = useState<State>({
    cliente: cachedCliente,
    loading: !cachedCliente && !!clienteId,
    error: null
  });

  useEffect(() => {
    setState((current) => ({
      cliente: cachedCliente ?? current.cliente,
      loading: !cachedCliente && !!clienteId,
      error: null
    }));
  }, [cachedCliente, clienteId]);

  const resolveContext = useCallback(() => {
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
  }, [filialId, session]);

  const loadCliente = useCallback(async () => {
    if (!clienteId) {
      setState({ ...EMPTY, error: 'Cliente não informado.' });
      return null;
    }

    if (cachedCliente) {
      setState({ cliente: cachedCliente, loading: false, error: null });
      return cachedCliente;
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const cliente = await getClienteById(resolveContext(), clienteId);
      if (!cliente) {
        setState({ cliente: null, loading: false, error: 'Cliente não encontrado.' });
        return null;
      }
      setState({ cliente, loading: false, error: null });
      return cliente;
    } catch (err) {
      setState({
        cliente: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Erro ao carregar cliente.'
      });
      return null;
    }
  }, [cachedCliente, clienteId, resolveContext]);

  useEffect(() => {
    if (!clienteId) {
      setState({ ...EMPTY, error: 'Cliente não informado.' });
      return;
    }
    if (cachedCliente) {
      setState({ cliente: cachedCliente, loading: false, error: null });
      return;
    }
    void loadCliente();
  }, [cachedCliente, clienteId, loadCliente]);

  const setCliente = useCallback((cliente: Cliente) => {
    setState({ cliente, loading: false, error: null });
  }, []);

  return {
    cliente: state.cliente,
    loading: state.loading,
    error: state.error,
    reload: loadCliente,
    setCliente
  };
}
