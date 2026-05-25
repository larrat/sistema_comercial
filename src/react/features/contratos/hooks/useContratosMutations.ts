import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFilialStore } from '../../../app/useFilialStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { contratosApi } from '../services/contratosApi';
import type { ContratoDraft, OrdemServicoDraft } from '../types';
import { toast } from 'sonner';

export function useContratosMutations() {
  const queryClient = useQueryClient();
  const filialId = useFilialStore((s) => s.filialId);
  const session = useAuthStore((s) => s.session);
  const config = getSupabaseConfig();

  const getContext = () => {
    if (!filialId || !session?.access_token || !config.ready) {
      throw new Error('Sessão, filial ou configuração não pronta');
    }
    return {
      url: config.url,
      key: config.key,
      token: session.access_token,
      filialId,
    };
  };

  const createContratoMutation = useMutation({
    mutationFn: (draft: ContratoDraft) => contratosApi.createContrato(getContext(), draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos', filialId] });
      toast.success('Contrato gerado com sucesso');
    },
    onError: (err: any) => {
      toast.error('Erro ao gerar contrato', { description: err.message });
    },
  });

  const createOsMutation = useMutation({
    mutationFn: (draft: OrdemServicoDraft) => contratosApi.createOrdemServico(getContext(), draft),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ordens_servico', filialId, variables.contrato_id] });
      toast.success('O.S. criada com sucesso');
    },
    onError: (err: any) => {
      toast.error('Erro ao criar O.S.', { description: err.message });
    },
  });

  return {
    createContrato: createContratoMutation.mutateAsync,
    isCreatingContrato: createContratoMutation.isPending,
    createOs: createOsMutation.mutateAsync,
    isCreatingOs: createOsMutation.isPending,
  };
}
