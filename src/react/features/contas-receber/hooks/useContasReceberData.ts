import { useEffect, useRef } from 'react';
import { useContasReceberStore } from '../store/useContasReceberStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { listContas, listBaixas } from '../services/contasReceberApi';

export function useContasReceberData() {
  const setContas = useContasReceberStore((s) => s.setContas);
  const setBaixas = useContasReceberStore((s) => s.setBaixas);
  const setStatus = useContasReceberStore((s) => s.setStatus);

  const session = useAuthStore((s) => s.session);
  const authStatus = useAuthStore((s) => s.status);
  const filialId = useFilialStore((s) => s.filialId);

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (authStatus === 'unknown') return;
    if (authStatus === 'unauthenticated' || !session?.access_token) {
      setStatus('error', 'Sessão expirada. Faça login novamente.');
      return;
    }
    if (!filialId) {
      setStatus('error', 'Nenhuma filial selecionada.');
      return;
    }

    const { url, key, ready } = getSupabaseConfig();
    if (!ready) {
      setStatus('error', 'Configuração do Supabase ausente.');
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    setStatus('loading');

    const ctx = { url, key, token: session.access_token, filialId };

    Promise.all([listContas(ctx), listBaixas(ctx)])
      .then(([contas, baixas]) => {
        setContas(contas);
        setBaixas(baixas);
      })
      .catch((err: unknown) => {
        fetchedRef.current = false;
        setStatus(
          'error',
          err instanceof Error ? err.message : 'Erro ao carregar contas a receber.'
        );
      });
  }, [authStatus, session, filialId, setContas, setBaixas, setStatus]);

  function reload() {
    fetchedRef.current = false;
    setStatus('loading');
    if (!session?.access_token || !filialId) return;
    const { url, key, ready } = getSupabaseConfig();
    if (!ready) return;
    fetchedRef.current = true;
    const ctx = { url, key, token: session.access_token, filialId };
    Promise.all([listContas(ctx), listBaixas(ctx)])
      .then(([contas, baixas]) => {
        setContas(contas);
        setBaixas(baixas);
      })
      .catch((err: unknown) => {
        fetchedRef.current = false;
        setStatus(
          'error',
          err instanceof Error ? err.message : 'Erro ao recarregar contas a receber.'
        );
      });
  }

  return { reload };
}
