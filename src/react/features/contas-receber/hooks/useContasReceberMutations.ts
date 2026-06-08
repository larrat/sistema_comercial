import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import {
  registrarBaixaRpc,
  estornarBaixaRpc,
  marcarContaPendenteRpc
} from '../services/contasReceberApi';
import type { ContaReceber, ContaReceberBaixa } from '../../../../types/domain';
import { CONTAS_RECEBER_KEYS } from './useContasReceberQueries';

function roundMoney(value: number): number {
  return Number(Number(value || 0).toFixed(2));
}

function hoje(): string {
  return new Date().toISOString().split('T')[0];
}

export function getValorRecebido(cr: ContaReceber): number {
  if (cr.status === 'cancelado') return 0;
  if (cr.status === 'recebido' || cr.status === 'pago') return roundMoney(Number(cr.valor || 0));
  if (cr.valor_recebido != null && Number.isFinite(Number(cr.valor_recebido))) return roundMoney(Number(cr.valor_recebido));
  return 0;
}

export function getValorEmAberto(cr: ContaReceber): number {
  if (cr.status === 'cancelado') return 0;
  if (cr.status === 'recebido' || cr.status === 'pago') return 0;
  if (cr.valor_em_aberto != null && Number.isFinite(Number(cr.valor_em_aberto))) return roundMoney(Number(cr.valor_em_aberto));
  return roundMoney(Math.max(0, Number(cr.valor || 0) - getValorRecebido(cr)));
}

export function getStatusLabel(cr: ContaReceber): string {
  if (cr.status === 'cancelado') return 'Cancelado';
  if (cr.status === 'recebido' || cr.status === 'pago') return 'Recebido';
  const aberto = getValorEmAberto(cr);
  if (aberto <= 0) return 'Recebido';
  if (getValorRecebido(cr) > 0 || cr.status === 'parcial') return 'Parcial';
  return 'Pendente';
}

export function getStatusEfetivo(cr: ContaReceber): 'pendente_ok' | 'vencido' | 'recebido' | 'cancelado' {
  if (cr.status === 'cancelado') return 'cancelado';
  if (cr.status === 'recebido' || cr.status === 'pago' || getValorEmAberto(cr) <= 0) return 'recebido';
  if (cr.vencimento < hoje()) return 'vencido';
  return 'pendente_ok';
}

export function useContasReceberMutations(propContas?: ContaReceber[], propBaixas?: ContaReceberBaixa[]) {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);

  const contas = propContas ?? queryClient.getQueryData<ContaReceber[]>(CONTAS_RECEBER_KEYS.lists()) ?? [];
  const baixas = propBaixas ?? queryClient.getQueryData<ContaReceberBaixa[]>(CONTAS_RECEBER_KEYS.baixas()) ?? [];

  function getCtx() {
    const { url, key } = getSupabaseConfig();
    const token = session?.access_token ?? '';
    return { url, key, token, filialId: filialId ?? '' };
  }

  function getBaixasConta(contaId: string): ContaReceberBaixa[] {
    return baixas
      .filter((b) => b.conta_receber_id === contaId)
      .sort((a, b) => String(b.recebido_em || '').localeCompare(String(a.recebido_em || '')));
  }

  const reloadContasReceber = () => {
    queryClient.invalidateQueries({ queryKey: CONTAS_RECEBER_KEYS.lists() });
    queryClient.invalidateQueries({ queryKey: CONTAS_RECEBER_KEYS.baixas() });
  };

  const registrarBaixaMutation = useMutation({
    mutationFn: async ({ contaId, valor, recebidoEmIso, observacao }: { contaId: string; valor: number; recebidoEmIso: string; observacao: string | null }) => {
      const ctx = getCtx();
      await registrarBaixaRpc(ctx, {
        baixaId: globalThis.crypto.randomUUID(),
        contaId,
        valor,
        recebidoEm: recebidoEmIso,
        observacao
      });
    },
    onSuccess: () => {
      reloadContasReceber();
    }
  });

  const marcarPendenteMutation = useMutation({
    mutationFn: async (contaId: string) => {
      const ctx = getCtx();
      await marcarContaPendenteRpc(ctx, contaId);
    },
    onSuccess: () => {
      reloadContasReceber();
    }
  });

  const estornarBaixaMutation = useMutation({
    mutationFn: async (baixaId: string) => {
      const ctx = getCtx();
      await estornarBaixaRpc(ctx, baixaId);
    },
    onSuccess: () => {
      reloadContasReceber();
    }
  });

  async function registrarBaixa(
    contaId: string,
    valor: number,
    recebidoEmIso: string,
    observacao: string | null
  ): Promise<{ ok: boolean; error?: string }> {
    const conta = contas.find((c) => c.id === contaId);
    if (!conta) return { ok: false, error: 'Conta não encontrada.' };

    const valorAberto = getValorEmAberto(conta);
    const valorBaixa = roundMoney(valor);

    if (valorBaixa <= 0) return { ok: false, error: 'Informe um valor maior que zero.' };
    if (valorBaixa > valorAberto + 0.001) {
      return { ok: false, error: 'A baixa não pode ultrapassar o valor em aberto.' };
    }

    try {
      await registrarBaixaMutation.mutateAsync({ contaId, valor: valorBaixa, recebidoEmIso, observacao });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erro ao registrar baixa.' };
    }
  }

  async function marcarRecebido(contaId: string): Promise<{ ok: boolean; error?: string }> {
    const conta = contas.find((c) => c.id === contaId);
    if (!conta) return { ok: false, error: 'Conta não encontrada.' };
    const aberto = getValorEmAberto(conta);
    if (aberto <= 0) return { ok: false, error: 'Esta conta já está quitada.' };
    return registrarBaixa(contaId, aberto, new Date().toISOString(), 'Recebimento total');
  }

  async function marcarPendente(contaId: string): Promise<{ ok: boolean; error?: string }> {
    const conta = contas.find((c) => c.id === contaId);
    if (!conta) return { ok: false, error: 'Conta não encontrada.' };

    try {
      await marcarPendenteMutation.mutateAsync(contaId);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro ao desfazer recebimento.'
      };
    }
  }

  async function estornarBaixa(
    contaId: string,
    baixaId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const conta = contas.find((c) => c.id === contaId);
    const baixa = baixas.find((b) => b.id === baixaId && b.conta_receber_id === contaId);
    if (!conta || !baixa) return { ok: false, error: 'Baixa não encontrada para estorno.' };

    try {
      await estornarBaixaMutation.mutateAsync(baixaId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erro ao estornar baixa.' };
    }
  }

  return { 
    registrarBaixa, 
    marcarRecebido, 
    marcarPendente, 
    estornarBaixa, 
    getBaixasConta,
    inFlight: new Set([
      ...(registrarBaixaMutation.isPending ? [registrarBaixaMutation.variables?.contaId as string] : []),
      ...(marcarPendenteMutation.isPending ? [marcarPendenteMutation.variables] : []),
      ...(estornarBaixaMutation.isPending && estornarBaixaMutation.variables ? baixas.find(b => b.id === estornarBaixaMutation.variables)?.conta_receber_id || [] : [])
    ].filter(Boolean))
  };
}
