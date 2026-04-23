import { useContasReceberStore } from '../store/useContasReceberStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import {
  listContas,
  listBaixas,
  registrarBaixaRpc,
  estornarBaixaRpc,
  marcarContaPendenteRpc
} from '../services/contasReceberApi';
import type { ContaReceber, ContaReceberBaixa } from '../../../../types/domain';

function roundMoney(value: number): number {
  return Number(Number(value || 0).toFixed(2));
}

function hoje(): string {
  return new Date().toISOString().split('T')[0];
}

export function getValorRecebido(cr: ContaReceber): number {
  if (Number.isFinite(Number(cr.valor_recebido))) return roundMoney(Number(cr.valor_recebido));
  return cr.status === 'recebido' ? roundMoney(Number(cr.valor || 0)) : 0;
}

export function getValorEmAberto(cr: ContaReceber): number {
  if (Number.isFinite(Number(cr.valor_em_aberto))) return roundMoney(Number(cr.valor_em_aberto));
  return roundMoney(Math.max(0, Number(cr.valor || 0) - getValorRecebido(cr)));
}

export function getStatusLabel(cr: ContaReceber): string {
  const aberto = getValorEmAberto(cr);
  if (aberto <= 0 || cr.status === 'recebido') return 'Recebido';
  if (getValorRecebido(cr) > 0 || cr.status === 'parcial') return 'Parcial';
  return 'Pendente';
}

export function getStatusEfetivo(cr: ContaReceber): 'pendente_ok' | 'vencido' | 'recebido' {
  if (getValorEmAberto(cr) <= 0 || cr.status === 'recebido') return 'recebido';
  if (cr.vencimento < hoje()) return 'vencido';
  return 'pendente_ok';
}

export function useContasReceberMutations() {
  const contas = useContasReceberStore((s) => s.contas);
  const baixas = useContasReceberStore((s) => s.baixas);
  const setContas = useContasReceberStore((s) => s.setContas);
  const setBaixas = useContasReceberStore((s) => s.setBaixas);
  const setInFlight = useContasReceberStore((s) => s.setInFlight);

  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);

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

  async function reloadContasReceber() {
    const ctx = getCtx();
    const [nextContas, nextBaixas] = await Promise.all([listContas(ctx), listBaixas(ctx)]);
    setContas(nextContas);
    setBaixas(nextBaixas);
  }

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

    setInFlight(contaId, true);

    try {
      const ctx = getCtx();
      await registrarBaixaRpc(ctx, {
        baixaId: globalThis.crypto.randomUUID(),
        contaId,
        valor: valorBaixa,
        recebidoEm: recebidoEmIso,
        observacao
      });
      await reloadContasReceber();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erro ao registrar baixa.' };
    } finally {
      setInFlight(contaId, false);
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

    setInFlight(contaId, true);

    try {
      const ctx = getCtx();
      await marcarContaPendenteRpc(ctx, contaId);
      await reloadContasReceber();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro ao desfazer recebimento.'
      };
    } finally {
      setInFlight(contaId, false);
    }
  }

  async function estornarBaixa(
    contaId: string,
    baixaId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const conta = contas.find((c) => c.id === contaId);
    const baixa = baixas.find((b) => b.id === baixaId && b.conta_receber_id === contaId);
    if (!conta || !baixa) return { ok: false, error: 'Baixa não encontrada para estorno.' };

    setInFlight(contaId, true);

    try {
      const ctx = getCtx();
      await estornarBaixaRpc(ctx, baixaId);
      await reloadContasReceber();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erro ao estornar baixa.' };
    } finally {
      setInFlight(contaId, false);
    }
  }

  return { registrarBaixa, marcarRecebido, marcarPendente, estornarBaixa, getBaixasConta };
}
