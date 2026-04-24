import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { emitToast } from '../../../app/legacy/events';
import { useFiliaisStore } from '../store/useFiliaisStore';
import { upsertFilial, deleteFilial } from '../services/filiaisApi';

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
      emitToast('Informe o nome da filial.', 'warning');
      return;
    }

    const duplicado = filiais.find(
      (f) => f.nome.trim().toLowerCase() === nome.toLowerCase() && f.id !== modalEditId
    );
    if (duplicado) {
      emitToast(`Filial já existe: ${duplicado.nome}.`, 'warning');
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
        cor: form.cor || '#163F80'
      };
      const saved = await upsertFilial(getCtx(), filial);
      upsertLocal(saved);
      closeModal();
      emitToast(`Filial ${modalEditId ? 'atualizada' : 'criada'}: ${saved.nome}.`, 'success');
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Erro ao salvar filial.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remover(id: string) {
    const filial = filiais.find((f) => f.id === id);
    if (
      !confirm(
        `Remover a filial "${filial?.nome ?? id}"? Esta ação afeta cadastros, pedidos e acessos vinculados.`
      )
    )
      return;

    try {
      await deleteFilial(getCtx(), id);
      removeLocal(id);
      emitToast('Filial removida.', 'success');
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Erro ao remover filial.', 'error');
    }
  }

  return { salvar, remover };
}
