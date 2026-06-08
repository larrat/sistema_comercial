import { useQuery } from '@tanstack/react-query';
import { listCampanhas, listCampanhaEnvios } from '../services/campanhasApi';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';

export const CAMPANHAS_KEYS = {
  all: ['campanhas'] as const,
  lists: () => [...CAMPANHAS_KEYS.all, 'list'] as const,
  envios: () => [...CAMPANHAS_KEYS.all, 'envios'] as const,
};

function useCtx() {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId) ?? '';
  const cfg = getSupabaseConfig();
  if (!session?.access_token || !filialId || !cfg.ready) return null;
  return { url: cfg.url, key: cfg.key, token: session.access_token, filialId };
}

export function useCampanhas() {
  const ctx = useCtx();

  return useQuery({
    queryKey: CAMPANHAS_KEYS.lists(),
    queryFn: () => listCampanhas(ctx!),
    enabled: !!ctx,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCampanhaEnvios() {
  const ctx = useCtx();

  return useQuery({
    queryKey: CAMPANHAS_KEYS.envios(),
    queryFn: () => listCampanhaEnvios(ctx!),
    enabled: !!ctx,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}
