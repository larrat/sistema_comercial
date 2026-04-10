import { useCallback, useEffect, useState } from 'react';

import type { ClienteFidelidadeLancamento, ClienteFidelidadeSaldo } from '../../../../types/domain';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import {
  addClienteFidelidadeLancamento,
  getClienteFidelidadeSaldo,
  listClienteFidelidadeLancamentos
} from '../services/fidelidadeApi';

type Options = {
  clienteId?: string | null;
  skip?: boolean;
};

export function useClienteFidelidade({ clienteId, skip = false }: Options) {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const [saldo, setSaldo] = useState<ClienteFidelidadeSaldo | null>(null);
  const [lancamentos, setLancamentos] = useState<ClienteFidelidadeLancamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveContext = useCallback(() => {
    if (!session?.access_token) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) {
      throw new Error('Configuração do Supabase ausente.');
    }
    return { url, key, token: session.access_token, filialId };
  }, [filialId, session]);

  const loadData = useCallback(async () => {
    if (!clienteId || skip) return;

    setLoading(true);
    setError(null);
    try {
      const context = resolveContext();
      const [nextSaldo, nextLancamentos] = await Promise.all([
        getClienteFidelidadeSaldo(context, clienteId),
        listClienteFidelidadeLancamentos(context, clienteId)
      ]);
      setSaldo(nextSaldo);
      setLancamentos(nextLancamentos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar fidelidade.');
    } finally {
      setLoading(false);
    }
  }, [clienteId, resolveContext, skip]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function submitLancamento(input: { tipo: string; pontos: string; observacao?: string }) {
    if (!clienteId) {
      throw new Error('Cliente não selecionado.');
    }

    const parsed = Number(input.pontos);
    if (!parsed || Number.isNaN(parsed)) {
      throw new Error('Informe a quantidade de pontos.');
    }

    const pontos = input.tipo === 'debito' ? -Math.abs(parsed) : parsed;

    setSaving(true);
    setError(null);
    try {
      await addClienteFidelidadeLancamento(resolveContext(), {
        clienteId,
        tipo: input.tipo as 'credito' | 'debito' | 'ajuste' | 'estorno',
        pontos,
        observacao: input.observacao
      });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao lançar fidelidade.';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  return { saldo, lancamentos, loading, saving, error, submitLancamento };
}
