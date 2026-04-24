import { useEffect } from 'react';

import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { listProdutos } from '../../produtos/services/produtosApi';
import {
  buildEstoqueHistoryRows,
  buildEstoqueMetrics,
  buildEstoquePositionRows
} from './useEstoqueCalculations';
import { listMovimentacoes } from '../services/estoqueApi';
import { useEstoqueStore } from '../store/useEstoqueStore';

export function useEstoqueData() {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const reloadVersion = useEstoqueStore((s) => s.reloadVersion);
  const setData = useEstoqueStore((s) => s.setData);
  const setStatus = useEstoqueStore((s) => s.setStatus);

  useEffect(() => {
    const token = session?.access_token || '';
    const config = getSupabaseConfig();

    if (!filialId) {
      setStatus('error', 'Selecione uma filial para consultar o estoque.');
      return;
    }

    if (!config.ready || !token) {
      setStatus('error', 'Sessão ou configuração indisponível para carregar o estoque.');
      return;
    }

    let cancelled = false;

    async function load() {
      setStatus('loading');

      try {
        const context = {
          url: config.url,
          key: config.key,
          token,
          filialId
        };

        const [produtos, movimentacoes] = await Promise.all([
          listProdutos(context),
          listMovimentacoes(context)
        ]);

        if (cancelled) return;

        const positionRows = buildEstoquePositionRows(produtos, movimentacoes);
        const historyRows = buildEstoqueHistoryRows(produtos, movimentacoes);
        const metrics = buildEstoqueMetrics(positionRows);

        setData({
          snapshot: { produtos, movimentacoes },
          metrics,
          positionRows,
          historyRows
        });
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : 'Não foi possível carregar a posição de estoque.';
        setStatus('error', message);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [filialId, reloadVersion, session?.access_token, setData, setStatus]);
}
