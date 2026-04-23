import { useEffect } from 'react';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { listFornecedores, listCotacaoPrecos, getCotacaoConfig } from '../services/cotacaoApi';
import type { CotacaoPrecoRow } from '../types';
import { useCotacaoStore } from '../store/useCotacaoStore';

function buildPrecosMap(rows: CotacaoPrecoRow[]) {
  const map: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    if (!map[row.produto_id]) map[row.produto_id] = {};
    map[row.produto_id][row.fornecedor_id] = row.preco;
  }
  return map;
}

export function useCotacaoData() {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const reloadVersion = useCotacaoStore((s) => s.reloadVersion);
  const setData = useCotacaoStore((s) => s.setData);
  const setStatus = useCotacaoStore((s) => s.setStatus);

  useEffect(() => {
    const token = session?.access_token || '';
    const config = getSupabaseConfig();

    if (!filialId) {
      setStatus('error', 'Selecione uma filial para acessar cotações.');
      return;
    }
    if (!config.ready || !token) {
      setStatus('error', 'Sessão ou configuração indisponível.');
      return;
    }

    let cancelled = false;

    async function load() {
      setStatus('loading');
      try {
        const ctx = { url: config.url, key: config.key, token, filialId };
        const [fornecedores, precosRows, cotConfig] = await Promise.all([
          listFornecedores(ctx),
          listCotacaoPrecos(ctx),
          getCotacaoConfig(ctx)
        ]);
        if (cancelled) return;
        setData({
          fornecedores,
          precos: buildPrecosMap(precosRows),
          config: cotConfig
        });
      } catch (err) {
        if (cancelled) return;
        setStatus('error', err instanceof Error ? err.message : 'Erro ao carregar cotação.');
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [filialId, reloadVersion, session?.access_token, setData, setStatus]);
}
