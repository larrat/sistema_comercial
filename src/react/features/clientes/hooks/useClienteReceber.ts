import { useCallback, useEffect, useState } from 'react';

import type { Cliente, ContaReceber } from '../../../../types/domain';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { listContas } from '../../contas-receber/services/contasReceberApi';

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function belongsContaToCliente(conta: ContaReceber, cliente: Cliente): boolean {
  if (conta.cliente_id && cliente.id && conta.cliente_id === cliente.id) {
    return true;
  }
  return normalizeText(conta.cliente) === normalizeText(cliente.nome);
}

export function useClienteReceber({
  cliente,
  skip = false
}: {
  cliente?: Cliente | null;
  skip?: boolean;
}) {
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveContext = useCallback(() => {
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
  }, [filialId, session]);

  const loadContas = useCallback(async () => {
    if (!cliente?.id || skip) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await listContas(resolveContext());
      setContas(rows.filter((conta) => belongsContaToCliente(conta, cliente)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar contas a receber.');
      setContas([]);
    } finally {
      setLoading(false);
    }
  }, [cliente, resolveContext, skip]);

  useEffect(() => {
    void loadContas();
  }, [loadContas]);

  return { contas, loading, error, reload: loadContas };
}
