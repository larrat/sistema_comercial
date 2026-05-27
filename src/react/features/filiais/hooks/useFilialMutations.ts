import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useFiliaisStore } from '../store/useFiliaisStore';
import { upsertFilial, deleteFilial } from '../services/filiaisApi';
import { logAudit } from '../../../shared/services/auditService';
import { FILIAIS_QUERY_KEY } from './useFiliaisData';

function uid() {
  return crypto.randomUUID();
}

export function useFilialMutations() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();
  const { form, modalEditId, setSaving, closeModal } = useFiliaisStore();

  function getCtx() {
    const cfg = getSupabaseConfig();
    return { url: cfg.url, key: cfg.key, token: session?.access_token ?? '' };
  }

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const nome = form.nome.trim();
      if (!nome) {
        throw new Error('Informe o nome da filial.');
      }

      // Check for duplicates - Note: in a real app this should ideally be handled by the backend or by querying the cache, but since we have local state form validation we'll keep it simple for now, bypassing the duplicate check since we don't have the full list directly in this hook anymore unless we read the cache.
      const filiais = queryClient.getQueryData<any[]>(FILIAIS_QUERY_KEY) || [];
      const duplicado = filiais.find(
        (f) => f.nome.trim().toLowerCase() === nome.toLowerCase() && f.id !== modalEditId
      );
      if (duplicado) {
        throw new Error(`Filial já existe: ${duplicado.nome}.`);
      }

      const filial = {
        id: modalEditId ?? uid(),
        nome,
        cidade: form.cidade.trim() || undefined,
        estado: form.estado.trim() || undefined,
        endereco: form.endereco.trim() || undefined,
        cor: form.cor || '#163F80',
        meta_mensal: form.meta_mensal ? parseFloat(form.meta_mensal) : undefined,
        is_fiscal: form.is_fiscal
      };

      const saved = await upsertFilial(getCtx(), filial);
      logAudit(getCtx().token, 'filiais', saved.id, modalEditId ? 'UPDATE' : 'INSERT', saved);
      return saved;
    },
    onMutate: () => setSaving(true),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: FILIAIS_QUERY_KEY });
      closeModal();
      toast.success(`Filial ${modalEditId ? 'atualizada' : 'criada'}: ${saved.nome}.`);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar filial.');
    },
    onSettled: () => setSaving(false),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteFilial(getCtx(), id);
      logAudit(getCtx().token, 'filiais', id, 'SOFT_DELETE');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FILIAIS_QUERY_KEY });
      toast.success('Filial removida.');
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Erro ao remover filial.');
    }
  });

  return {
    salvar: () => upsertMutation.mutateAsync(),
    remover: (id: string) => removeMutation.mutateAsync(id)
  };
}
