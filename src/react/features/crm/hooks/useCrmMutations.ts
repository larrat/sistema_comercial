import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFilialStore } from '../../../app/useFilialStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { crmApi } from '../services/crmApi';
import type { CrmEstagio, CrmOportunidadeDraft } from '../types';
import { toast } from 'sonner';

export function useCrmMutations() {
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

  const createMutation = useMutation({
    mutationFn: (draft: CrmOportunidadeDraft) => crmApi.createOportunidade(getContext(), draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'oportunidades', filialId] });
      toast.success('Oportunidade criada com sucesso');
    },
    onError: (err: any) => {
      toast.error('Erro ao criar oportunidade', { description: err.message });
    },
  });

  const updateEstagioMutation = useMutation({
    mutationFn: ({ id, estagio }: { id: string; estagio: CrmEstagio }) => 
      crmApi.updateEstagio(getContext(), id, estagio),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'oportunidades', filialId] });
      // We don't need to spam toasts on every column drag, so we keep it quiet here 
      // or optionally show a subtle toast
    },
    onError: (err: any) => {
      toast.error('Erro ao mover oportunidade', { description: err.message });
    },
  });

  return {
    createOportunidade: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateEstagio: updateEstagioMutation.mutateAsync,
  };
}
