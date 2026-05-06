import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ContaReceber, ContaReceberBaixa, Pedido } from '../../../../types/domain';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { listBaixas, listContas } from '../../contas-receber/services/contasReceberApi';
import { usePedidoStore } from '../store/usePedidoStore';
import { getPedidoById } from '../services/pedidosApi';

export type PedidoFinanceiroState = {
  conta: ContaReceber | null;
  baixas: ContaReceberBaixa[];
  loading: boolean;
  error: string | null;
};

type State = {
  pedido: Pedido | null;
  loading: boolean;
  error: string | null;
};

const EMPTY: State = {
  pedido: null,
  loading: false,
  error: null
};

const EMPTY_FINANCEIRO: PedidoFinanceiroState = {
  conta: null,
  baixas: [],
  loading: false,
  error: null
};

export function usePedidoProfile(pedidoId?: string | null) {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const pedidos = usePedidoStore((s) => s.pedidos);

  const cachedPedido = useMemo(
    () => pedidos.find((pedido) => pedido.id === pedidoId) ?? null,
    [pedidoId, pedidos]
  );

  const [state, setState] = useState<State>({
    pedido: cachedPedido,
    loading: !cachedPedido && !!pedidoId,
    error: null
  });
  const [financeiro, setFinanceiro] = useState<PedidoFinanceiroState>(EMPTY_FINANCEIRO);

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

  const loadPedido = useCallback(async () => {
    if (!pedidoId) {
      setState({ ...EMPTY, error: 'Pedido não informado.' });
      return null;
    }

    if (cachedPedido) {
      setState({ pedido: cachedPedido, loading: false, error: null });
      return cachedPedido;
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const pedido = await getPedidoById(resolveContext(), pedidoId);
      if (!pedido) {
        setState({ pedido: null, loading: false, error: 'Pedido não encontrado.' });
        return null;
      }
      setState({ pedido, loading: false, error: null });
      return pedido;
    } catch (err) {
      setState({
        pedido: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Erro ao carregar pedido.'
      });
      return null;
    }
  }, [cachedPedido, pedidoId, resolveContext]);

  const loadFinanceiro = useCallback(async () => {
    if (!pedidoId) {
      setFinanceiro(EMPTY_FINANCEIRO);
      return;
    }

    setFinanceiro((current) => ({ ...current, loading: true, error: null }));
    try {
      const ctx = resolveContext();
      const [contas, baixas] = await Promise.all([listContas(ctx), listBaixas(ctx)]);
      const conta = contas.find((item) => item.pedido_id === pedidoId) ?? null;
      setFinanceiro({
        conta,
        baixas: conta ? baixas.filter((item) => item.conta_receber_id === conta.id) : [],
        loading: false,
        error: null
      });
    } catch (err) {
      setFinanceiro({
        conta: null,
        baixas: [],
        loading: false,
        error: err instanceof Error ? err.message : 'Erro ao carregar financeiro do pedido.'
      });
    }
  }, [pedidoId, resolveContext]);

  useEffect(() => {
    if (!pedidoId) {
      setState({ ...EMPTY, error: 'Pedido não informado.' });
      return;
    }
    if (cachedPedido) {
      setState({ pedido: cachedPedido, loading: false, error: null });
      return;
    }
    void loadPedido();
  }, [cachedPedido, pedidoId, loadPedido]);

  useEffect(() => {
    void loadFinanceiro();
  }, [loadFinanceiro]);

  const setPedido = useCallback((pedido: Pedido) => {
    setState({ pedido, loading: false, error: null });
  }, []);

  return {
    pedido: state.pedido,
    loading: state.loading,
    error: state.error,
    financeiro,
    reload: loadPedido,
    reloadFinanceiro: loadFinanceiro,
    setPedido
  };
}
