import { useState } from 'react';

import type { Cliente } from '../../../../types/domain';
import { useClienteStore } from '../store/useClienteStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { saveCliente, type ClienteWriteInput } from '../services/clientesApi';

export function useClienteMutations() {
  const upsertCliente = useClienteStore((s) => s.upsertCliente);
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitCliente(input: ClienteWriteInput): Promise<Cliente> {
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

    setSaving(true);
    setError(null);

    try {
      const saved = await saveCliente({ url, key, token: session.access_token, filialId }, input);
      const normalized = saved ?? {
        ...input,
        id: input.id ?? crypto.randomUUID(),
        filial_id: filialId
      };
      upsertCliente(normalized as Cliente);
      return normalized as Cliente;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar cliente.';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  return { submitCliente, saving, error };
}
