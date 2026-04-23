import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { emitToast } from '../../../app/legacy/events';
import { useRcasStore } from '../store/useRcasStore';
import { upsertRca, deactivateRca } from '../services/rcasApi';
import type { Rca } from '../../../../types/domain';

function uid() {
  return crypto.randomUUID();
}

function buildInicial(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function useRcasMutations() {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId) ?? '';

  const rcas = useRcasStore((s) => s.rcas);
  const modalEditId = useRcasStore((s) => s.modalEditId);
  const modalNome = useRcasStore((s) => s.modalNome);
  const setSaving = useRcasStore((s) => s.setSaving);
  const closeModal = useRcasStore((s) => s.closeModal);
  const upsertLocal = useRcasStore((s) => s.upsertLocal);
  const deactivateLocal = useRcasStore((s) => s.deactivateLocal);

  function getCtx() {
    const cfg = getSupabaseConfig();
    return { url: cfg.url, key: cfg.key, token: session?.access_token ?? '', filialId };
  }

  async function salvar() {
    const nome = modalNome.trim();
    if (!nome) {
      emitToast('Informe o nome do vendedor.', 'warning');
      return;
    }

    const duplicado = rcas.find(
      (r) => r.nome.trim().toLowerCase() === nome.toLowerCase() && r.id !== modalEditId
    );
    if (duplicado) {
      emitToast(`Vendedor já existe: ${duplicado.nome}.`, 'warning');
      return;
    }

    setSaving(true);
    try {
      const rca: Rca = {
        id: modalEditId ?? uid(),
        filial_id: filialId,
        nome,
        inicial: buildInicial(nome),
        ativo: true
      };
      const saved = await upsertRca(getCtx(), rca);
      upsertLocal(saved);
      closeModal();
      emitToast(`Vendedor ${modalEditId ? 'atualizado' : 'cadastrado'}: ${saved.nome}.`, 'success');
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Erro ao salvar vendedor.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function desativar(id: string) {
    try {
      await deactivateRca(getCtx(), id);
      deactivateLocal(id);
      emitToast('Vendedor desativado.', 'success');
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Erro ao desativar vendedor.', 'error');
    }
  }

  return { salvar, desativar };
}
