import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useToastStore } from '../../../app/lib/useToastStore';
import { useFiliaisStore } from '../store/useFiliaisStore';
import { upsertFilial, deleteFilial } from '../services/filiaisApi';
import { logAudit } from '../../../shared/services/auditService';

function uid() {
  return crypto.randomUUID();
}

export function useFilialMutations() {
  const session = useAuthStore((s) => s.session);
  const { form, modalEditId, filiais, setSaving, closeModal, upsertLocal, removeLocal } =
    useFiliaisStore();

  function getCtx() {
    const cfg = getSupabaseConfig();
    return { url: cfg.url, key: cfg.key, token: session?.access_token ?? '' };
  }

  async function salvar() {
    const nome = form.nome.trim();
    if (!nome) {
      useToastStore.getState().addToast('Informe o nome da filial.', 'warning');
      return;
    }

    const duplicado = filiais.find(
      (f) => f.nome.trim().toLowerCase() === nome.toLowerCase() && f.id !== modalEditId
    );
    if (duplicado) {
      useToastStore.getState().addToast(`Filial já existe: ${duplicado.nome}.`, 'warning');
      return;
    }

    setSaving(true);
    try {
      const filial = {
        id: modalEditId ?? uid(),
        nome,
        cidade: form.cidade.trim() || undefined,
        estado: form.estado.trim() || undefined,
        endereco: form.endereco.trim() || undefined,
        cor: form.cor || '#163F80',
        meta_mensal: form.meta_mensal ? parseFloat(form.meta_mensal) : undefined
      };
      const saved = await upsertFilial(getCtx(), filial);
      logAudit(getCtx().token, 'filiais', saved.id, modalEditId ? 'UPDATE' : 'INSERT', saved);
      upsertLocal(saved);
      closeModal();
      useToastStore
        .getState()
        .addToast(`Filial ${modalEditId ? 'atualizada' : 'criada'}: ${saved.nome}.`, 'success');
    } catch (e) {
      useToastStore
        .getState()
        .addToast(e instanceof Error ? e.message : 'Erro ao salvar filial.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remover(id: string) {
    const filial = filiais.find((f) => f.id === id);
    if (!filial) return;

    try {
      await deleteFilial(getCtx(), id);
      logAudit(getCtx().token, 'filiais', id, 'SOFT_DELETE');
      removeLocal(id);
      useToastStore.getState().addToast('Filial removida.', 'success');
    } catch (e) {
      useToastStore
        .getState()
        .addToast(e instanceof Error ? e.message : 'Erro ao remover filial.', 'error');
    }
  }

  return { salvar, remover };
}
