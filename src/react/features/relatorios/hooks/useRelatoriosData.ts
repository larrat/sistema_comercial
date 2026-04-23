import { useCallback, useEffect } from 'react';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useRelatoriosStore } from '../store/useRelatoriosStore';
import {
  listJogosAgenda,
  listClientesParaRelatorio,
  listPedidosParaRelatorio
} from '../services/relatoriosApi';

export function useRelatoriosData() {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId) ?? '';
  const reloadKey = useRelatoriosStore((s) => s.reloadKey);
  const setJogos = useRelatoriosStore((s) => s.setJogos);
  const setClientes = useRelatoriosStore((s) => s.setClientes);
  const setPedidos = useRelatoriosStore((s) => s.setPedidos);
  const setLoading = useRelatoriosStore((s) => s.setLoading);
  const setError = useRelatoriosStore((s) => s.setError);

  const load = useCallback(async () => {
    if (!session?.access_token || !filialId) return;
    const cfg = getSupabaseConfig();
    if (!cfg.ready) return;

    const ctx = { url: cfg.url, key: cfg.key, token: session.access_token, filialId };
    setLoading(true);
    setError(null);
    try {
      const [jogos, clientes, pedidos] = await Promise.all([
        listJogosAgenda(ctx),
        listClientesParaRelatorio(ctx),
        listPedidosParaRelatorio(ctx)
      ]);
      setJogos(jogos);
      setClientes(clientes);
      setPedidos(pedidos);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados do relatório.');
    } finally {
      setLoading(false);
    }
  }, [filialId, session?.access_token, setJogos, setClientes, setPedidos, setLoading, setError]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);
}
