import { useQuery } from '@tanstack/react-query';
import { listContas, listBaixas } from '../services/contasReceberApi';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';

export const CONTAS_RECEBER_KEYS = {
  all: ['contasReceber'] as const,
  lists: () => [...CONTAS_RECEBER_KEYS.all, 'list'] as const,
  baixas: () => [...CONTAS_RECEBER_KEYS.all, 'baixas'] as const,
};

function useCtx() {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId) ?? '';
  const cfg = getSupabaseConfig();
  if (!session?.access_token || !filialId || !cfg.ready) return null;
  return { url: cfg.url, key: cfg.key, token: session.access_token, filialId };
}

export function useContas() {
  const ctx = useCtx();

  return useQuery({
    queryKey: CONTAS_RECEBER_KEYS.lists(),
    queryFn: () => listContas(ctx!),
    enabled: !!ctx,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBaixas() {
  const ctx = useCtx();

  return useQuery({
    queryKey: CONTAS_RECEBER_KEYS.baixas(),
    queryFn: () => listBaixas(ctx!),
    enabled: !!ctx,
    staleTime: 5 * 60 * 1000,
  });
}
