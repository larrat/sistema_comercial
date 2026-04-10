import { useEffect, useState } from 'react';

import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import type { ClienteNota } from '../types';
import { addNota, listNotas } from '../services/notasApi';

type Options = {
  clienteId?: string | null;
  skip?: boolean;
};

export function useClienteNotes({ clienteId, skip = false }: Options) {
  const session = useAuthStore((s) => s.session);
  const [notas, setNotas] = useState<ClienteNota[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resolveContext() {
    if (!session?.access_token) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) {
      throw new Error('Configuração do Supabase ausente.');
    }
    return { url, key, token: session.access_token };
  }

  useEffect(() => {
    if (skip || !clienteId) return;
    let active = true;
    setLoading(true);
    setError(null);

    listNotas(resolveContext(), clienteId)
      .then((items) => {
        if (!active) return;
        setNotas(items);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Erro ao carregar notas.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [clienteId, skip, session]);

  async function submitNota(texto: string) {
    if (!clienteId) {
      throw new Error('Cliente não selecionado.');
    }

    const cleaned = texto.trim();
    if (!cleaned) {
      throw new Error('Digite uma nota antes de salvar.');
    }

    setSaving(true);
    setError(null);

    const nota: ClienteNota = {
      cliente_id: clienteId,
      texto: cleaned,
      data: new Date().toLocaleString('pt-BR')
    };

    try {
      const saved = await addNota(resolveContext(), nota);
      setNotas((current) => [saved, ...current]);
      return saved;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar nota.';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  return { notas, loading, saving, error, submitNota };
}
