import { useQuery } from '@tanstack/react-query';
import { useFilialStore } from '../../../app/useFilialStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { contratosApi } from '../services/contratosApi';

export function useContratosData() {
  const filialId = useFilialStore((s) => s.filialId);
  const session = useAuthStore((s) => s.session);
  const config = getSupabaseConfig();

  const token = session?.access_token;

  return useQuery({
    queryKey: ['contratos', filialId],
    queryFn: async () => {
      if (!filialId || !token || !config.ready) return [];
      return contratosApi.getContratos({
        url: config.url,
        key: config.key,
        token,
        filialId,
      });
    },
    enabled: !!filialId && !!token && config.ready,
  });
}

export function useContratoDetail(id: string | undefined) {
  const filialId = useFilialStore((s) => s.filialId);
  const session = useAuthStore((s) => s.session);
  const config = getSupabaseConfig();

  const token = session?.access_token;

  return useQuery({
    queryKey: ['contratos', filialId, id],
    queryFn: async () => {
      if (!filialId || !token || !config.ready || !id) return null;
      return contratosApi.getContratoById({
        url: config.url,
        key: config.key,
        token,
        filialId,
      }, id);
    },
    enabled: !!filialId && !!token && config.ready && !!id,
  });
}

export function useOrdensServicoData(contratoId: string | undefined) {
  const filialId = useFilialStore((s) => s.filialId);
  const session = useAuthStore((s) => s.session);
  const config = getSupabaseConfig();

  const token = session?.access_token;

  return useQuery({
    queryKey: ['ordens_servico', filialId, contratoId],
    queryFn: async () => {
      if (!filialId || !token || !config.ready || !contratoId) return [];
      return contratosApi.getOrdensServico({
        url: config.url,
        key: config.key,
        token,
        filialId,
      }, contratoId);
    },
    enabled: !!filialId && !!token && config.ready && !!contratoId,
  });
}
