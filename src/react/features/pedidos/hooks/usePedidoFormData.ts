/**
 * Carrega produtos, clientes e RCAs necessários para o formulário de pedido.
 * Faz um único fetch por instância — não usa store global, vive no escopo do form.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import type { Produto, Rca } from '../../../../types/domain';
import type { ClienteLight } from '../services/clientesLightApi';
import { listClientesLight } from '../services/clientesLightApi';
import { listProdutos } from '../services/produtosApi';
import { listRcas } from '../services/rcasApi';

export type PedidoFormData = {
  produtos: Produto[];
  clientes: ClienteLight[];
  rcas: Rca[];
  loading: boolean;
  error: string | null;
};

const EMPTY: PedidoFormData = {
  produtos: [],
  clientes: [],
  rcas: [],
  loading: false,
  error: null
};

export function usePedidoFormData(): PedidoFormData {
  const [state, setState] = useState<PedidoFormData>({ ...EMPTY, loading: true });
  const loadedRef = useRef(false);

  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);

  useEffect(() => {
    if (loadedRef.current) return;
    if (!session?.access_token || !filialId) {
      setState({ ...EMPTY, error: 'Sessão ou filial ausente.' });
      return;
    }
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) {
      setState({ ...EMPTY, error: 'Configuração do Supabase ausente.' });
      return;
    }

    loadedRef.current = true;
    const ctx = { url, key, token: session.access_token, filialId };

    Promise.all([listProdutos(ctx), listClientesLight(ctx), listRcas(ctx)])
      .then(([produtos, clientes, rcas]) => {
        setState({ produtos, clientes, rcas, loading: false, error: null });
      })
      .catch((err: unknown) => {
        loadedRef.current = false;
        setState({
          ...EMPTY,
          loading: false,
          error: err instanceof Error ? err.message : 'Erro ao carregar dados do formulário.'
        });
      });
  }, [session, filialId]);

  return state;
}
