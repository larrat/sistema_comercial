import { useState } from 'react';

import type { Cliente } from '../../../../types/domain';
import { emitToast } from '../../../app/legacy/events';
import { emitLegacyEvent } from '../../../app/legacy/events';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { trackEvent, type AnalyticsMetadata } from '../../../shared/lib/analytics';
import { useClienteStore } from '../store/useClienteStore';
import { deleteCliente, saveCliente, type ClienteWriteInput } from '../services/clientesApi';

type ClienteSubmitTracking = {
  eventName: 'cliente_criado' | 'cliente_editado';
  metadata?: Record<string, AnalyticsMetadata>;
};

export function useClienteMutations() {
  const upsertCliente = useClienteStore((s) => s.upsertCliente);
  const removeCliente = useClienteStore((s) => s.removeCliente);
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resolveContext() {
    if (!session?.access_token) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (!filialId) {
      throw new Error('Nenhuma filial selecionada.');
    }

    const { url, key, ready } = getSupabaseConfig();
    if (!ready) {
      throw new Error('Configuração do Supabase ausente.');
    }

    return { url, key, token: session.access_token, filialId };
  }

  async function submitCliente(
    input: ClienteWriteInput,
    tracking?: ClienteSubmitTracking
  ): Promise<Cliente> {
    const context = resolveContext();

    setSaving(true);
    setError(null);

    try {
      const saved = await saveCliente(context, input);
      const normalized = saved ?? {
        ...input,
        id: input.id ?? crypto.randomUUID(),
        filial_id: context.filialId
      };
      upsertCliente(normalized as Cliente);
      emitLegacyEvent('sc:cliente-salvo', normalized);
      emitToast(
        input.id ? `Cliente atualizado: ${normalized.nome}.` : `Cliente cadastrado: ${normalized.nome}.`,
        'success'
      );
      if (tracking) {
        trackEvent({
          event_name: tracking.eventName,
          module: 'clientes',
          user_id:
            session?.user && typeof session.user === 'object' && 'id' in session.user
              ? String(session.user.id ?? '')
              : null,
          tenant_id: filialId ?? null,
          metadata: tracking.metadata,
          result: 'success'
        });
      }
      return normalized as Cliente;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar cliente.';
      setError(message);
      emitToast(message, 'error');
      if (tracking) {
        trackEvent({
          event_name: tracking.eventName,
          module: 'clientes',
          user_id:
            session?.user && typeof session.user === 'object' && 'id' in session.user
              ? String(session.user.id ?? '')
              : null,
          tenant_id: filialId ?? null,
          metadata: tracking.metadata,
          result: 'error'
        });
      }
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function deleteClienteById(clienteId: string): Promise<void> {
    const context = resolveContext();

    setDeletingId(clienteId);
    setError(null);

    try {
      await deleteCliente(context, clienteId);
      removeCliente(clienteId);
      emitLegacyEvent('sc:cliente-removido', { id: clienteId });
      emitToast('Cliente removido.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover cliente.';
      setError(message);
      emitToast(message, 'error');
      throw err;
    } finally {
      setDeletingId(null);
    }
  }

  return { submitCliente, deleteClienteById, saving, deletingId, error };
}
