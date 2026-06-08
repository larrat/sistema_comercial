import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useToastStore } from '../../../app/lib/useToastStore';
import { useCampanhasStore } from '../store/useCampanhasStore';
import {
  upsertCampanha,
  deleteCampanha,
  patchEnvioStatus,
  gerarFilaEdge
} from '../services/campanhasApi';
import type { Campanha, CampanhaEnvio } from '../../../../types/domain';
import { CAMPANHAS_KEYS } from './useCampanhasQueries';

function useCtx() {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId) ?? '';
  const cfg = getSupabaseConfig();
  if (!session?.access_token || !filialId || !cfg.ready) return null;
  return { url: cfg.url, key: cfg.key, token: session.access_token, filialId };
}

export function useCampanhasMutations() {
  const ctx = useCtx();
  const queryClient = useQueryClient();
  const closeCampModal = useCampanhasStore((s) => s.closeCampModal);
  const avancarLote = useCampanhasStore((s) => s.avancarLote);

  const salvarMutation = useMutation({
    mutationFn: async (dados: Partial<Campanha>) => {
      if (!ctx) throw new Error('Não autenticado');
      return await upsertCampanha(ctx, dados);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAMPANHAS_KEYS.lists() });
      closeCampModal();
      useToastStore.getState().addToast('Campanha salva com sucesso.', 'success');
    },
    onError: (e) => {
      useToastStore.getState().addToast(e instanceof Error ? e.message : 'Erro ao salvar campanha.', 'error');
    }
  });

  const removerMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!ctx) throw new Error('Não autenticado');
      return await deleteCampanha(ctx, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAMPANHAS_KEYS.lists() });
      useToastStore.getState().addToast('Campanha removida.', 'success');
    },
    onError: (e) => {
      useToastStore.getState().addToast(e instanceof Error ? e.message : 'Erro ao remover campanha.', 'error');
    }
  });

  const gerarFilaMutation = useMutation({
    mutationFn: async (campanhaId: string) => {
      if (!ctx) throw new Error('Não autenticado');
      return await gerarFilaEdge(ctx, campanhaId, false);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: CAMPANHAS_KEYS.envios() });
      queryClient.invalidateQueries({ queryKey: CAMPANHAS_KEYS.lists() });
      useToastStore.getState().addToast(
        `Fila gerada: ${result.criados} envios criados, ${result.ignorados} ignorados.`,
        'success'
      );
    },
    onError: (e) => {
      useToastStore.getState().addToast(e instanceof Error ? e.message : 'Erro ao gerar fila.', 'error');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, erro, enviado_em }: { id: string; status: CampanhaEnvio['status']; erro?: string | null; enviado_em?: string | null }) => {
      if (!ctx) throw new Error('Não autenticado');
      return await patchEnvioStatus(ctx, id, { status, erro, enviado_em });
    },
    onMutate: async ({ id, status, erro, enviado_em }) => {
      await queryClient.cancelQueries({ queryKey: CAMPANHAS_KEYS.envios() });
      const previousEnvios = queryClient.getQueryData<CampanhaEnvio[]>(CAMPANHAS_KEYS.envios());
      if (previousEnvios) {
        queryClient.setQueryData<CampanhaEnvio[]>(CAMPANHAS_KEYS.envios(), (old) =>
          (old || []).map((e) => (e.id === id ? { ...e, status, erro: erro || null, enviado_em: enviado_em || null } : e))
        );
      }
      return { previousEnvios };
    },
    onError: (err, variables, context) => {
      if (context?.previousEnvios) {
        queryClient.setQueryData(CAMPANHAS_KEYS.envios(), context.previousEnvios);
      }
      useToastStore.getState().addToast('Erro ao atualizar status do envio.', 'error');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CAMPANHAS_KEYS.envios() });
    }
  });

  const marcarEnviado = async (envio: CampanhaEnvio) => {
    return updateStatusMutation.mutateAsync({ 
      id: envio.id, 
      status: 'enviado', 
      enviado_em: new Date().toISOString(), 
      erro: null 
    });
  };

  const marcarFalhou = async (envio: CampanhaEnvio, erro = 'Falha manual') => {
    return updateStatusMutation.mutateAsync({ 
      id: envio.id, 
      status: 'falhou', 
      erro 
    });
  };

  const desfazer = async (envio: CampanhaEnvio) => {
    return updateStatusMutation.mutateAsync({ 
      id: envio.id, 
      status: 'pendente', 
      enviado_em: null, 
      erro: null 
    });
  };

  const marcarSelecionadosEnviados = async (envios: CampanhaEnvio[], ids: string[]) => {
    const targets = envios.filter((e) => ids.includes(e.id));
    await Promise.all(targets.map(marcarEnviado));
  };

  const marcarSelecionadosFalhou = async (envios: CampanhaEnvio[], ids: string[]) => {
    const targets = envios.filter((e) => ids.includes(e.id));
    await Promise.all(targets.map((e) => marcarFalhou(e)));
  };

  function abrirWhatsApp(envio: CampanhaEnvio) {
    if (!envio.destino) return;
    const num = envio.destino.replace(/\D/g, '');
    const msg = encodeURIComponent(envio.mensagem || '');
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  }

  function abrirWhatsAppEAvancarLote(envio: CampanhaEnvio, allEnvios: CampanhaEnvio[], campanhas: Campanha[]) {
    abrirWhatsApp(envio);
    avancarLote(allEnvios, campanhas);
  }

  return {
    salvar: (dados: Partial<Campanha>) => salvarMutation.mutateAsync(dados),
    remover: (id: string) => removerMutation.mutateAsync(id),
    gerarFila: async (campanhaId: string) => {
      const win = window.open('', '_blank');
      try {
        await gerarFilaMutation.mutateAsync(campanhaId);
      } finally {
        if (win) win.close();
      }
    },
    marcarEnviado,
    marcarFalhou,
    desfazer,
    marcarSelecionadosEnviados,
    marcarSelecionadosFalhou,
    abrirWhatsApp,
    abrirWhatsAppEAvancarLote,
    isSaving: salvarMutation.isPending
  };
}
