import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFilialStore } from '../../../app/useFilialStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { agendaApi } from '../services/agendaApi';
import type { AgendaEvento } from '../types';
import { toast } from 'sonner';

export function useAgendaMutations() {
  const queryClient = useQueryClient();
  const filialId = useFilialStore((s) => s.filialId);
  const session = useAuthStore((s) => s.session);
  const config = getSupabaseConfig();

  const getContext = () => {
    if (!filialId || !session?.access_token || !config.ready) {
      throw new Error('Não autenticado');
    }
    return {
      url: config.url,
      key: config.key,
      token: session.access_token,
      filialId,
    };
  };

  const createEvento = useMutation({
    mutationFn: (evento: Partial<AgendaEvento>) => agendaApi.createEvento(getContext(), evento),
    onSuccess: () => {
      // Invalida tudo que começa com agenda_eventos daquela filial
      queryClient.invalidateQueries({ queryKey: ['agenda_eventos', filialId] });
      toast.success('Evento criado na agenda');
    },
    onError: (e: any) => {
      toast.error('Erro ao criar evento', { description: e.message });
    }
  });

  return {
    createEvento: createEvento.mutateAsync,
    isCreating: createEvento.isPending
  };
}
