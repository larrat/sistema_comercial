import { useContasReceberStore } from '../store/useContasReceberStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import {
  upsertConta,
  createBaixa,
  deleteBaixa,
  deleteBaixasByConta
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

export function buildContaFromBaixas(
  conta: ContaReceber,
  baixas: ContaReceberBaixa[]
): ContaReceber {
  const sorted = [...baixas].sort((a, b) =>
    String(b.recebido_em || '').localeCompare(String(a.recebido_em || ''))
  );
  const valorRecebido = roundMoney(sorted.reduce((acc, b) => acc + Number(b.valor || 0), 0));
  const valorEmAberto = roundMoney(Math.max(0, Number(conta.valor || 0) - valorRecebido));
  const ultima = sorted[0] ?? null;
  const quitado = valorEmAberto <= 0;
  return {
    ...conta,
    valor_recebido: valorRecebido,
    valor_em_aberto: valorEmAberto,
    status: quitado ? 'recebido' : valorRecebido > 0 ? 'parcial' : 'pendente',
    recebido_em: quitado ? (ultima?.recebido_em ?? null) : null,
    ultimo_recebimento_em: ultima?.recebido_em ?? null
  };
}

export function useContasReceberMutations() {
  const contas = useContasReceberStore((s) => s.contas);
  const baixas = useContasReceberStore((s) => s.baixas);
  const upsertContaStore = useContasReceberStore((s) => s.upsertConta);
  const syncBaixaStore = useContasReceberStore((s) => s.syncBaixa);
  const removeBaixaStore = useContasReceberStore((s) => s.removeBaixa);
  const removeBaixasByContaStore = useContasReceberStore((s) => s.removeBaixasByConta);
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

  async function registrarBaixa(
    contaId: string,
    valor: number,
    recebidoEmIso: string,
    observacao: string | null
  ): Promise<{ ok: boolean; error?: string }> {
    const conta = contas.find((c) => c.id === contaId);
    if (!conta) return { ok: false, error: 'Conta não encontrada.' };

    const valorAberto = getValorEmAberto(conta);
    const valorRecebidoAtual = getValorRecebido(conta);
    const valorBaixa = roundMoney(valor);

    if (valorBaixa <= 0) return { ok: false, error: 'Informe um valor maior que zero.' };
    if (valorBaixa > valorAberto + 0.001) {
      return { ok: false, error: `A baixa não pode ultrapassar o valor em aberto.` };
    }

    const novoValorRecebido = roundMoney(valorRecebidoAtual + valorBaixa);
    const novoValorAberto = roundMoney(Math.max(0, Number(conta.valor || 0) - novoValorRecebido));
    const quitado = novoValorAberto <= 0;

    const baixa: ContaReceberBaixa = {
      id: globalThis.crypto.randomUUID(),
      filial_id: filialId ?? '',
      conta_receber_id: conta.id,
      pedido_id: conta.pedido_id ?? null,
      pedido_num: conta.pedido_num ?? null,
      cliente_id: conta.cliente_id ?? null,
      cliente: conta.cliente,
      valor: valorBaixa,
      recebido_em: recebidoEmIso,
      observacao
    };

    const updated: ContaReceber = {
      ...conta,
      valor_recebido: novoValorRecebido,
      valor_em_aberto: novoValorAberto,
      status: quitado ? 'recebido' : 'parcial',
      recebido_em: quitado ? recebidoEmIso : null,
      ultimo_recebimento_em: recebidoEmIso
    };

    setInFlight(contaId, true);
    // Optimistic update
    upsertContaStore(updated);
    syncBaixaStore(baixa);

    try {
      const ctx = getCtx();
      await Promise.all([createBaixa(ctx, baixa), upsertConta(ctx, updated)]);
      // Notify legacy cache
      window.dispatchEvent(new CustomEvent('sc:conta-receber-atualizada', { detail: updated }));
      return { ok: true };
    } catch (err) {
      // Revert optimistic update on failure
      upsertContaStore(conta);
      removeBaixaStore(baixa.id);
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

    const updated: ContaReceber = {
      ...conta,
      status: 'pendente',
      valor_recebido: 0,
      valor_em_aberto: roundMoney(Number(conta.valor || 0)),
      recebido_em: null,
      ultimo_recebimento_em: null
    };

    setInFlight(contaId, true);
    upsertContaStore(updated);
    removeBaixasByContaStore(contaId);

    try {
      const ctx = getCtx();
      await Promise.all([deleteBaixasByConta(ctx, contaId), upsertConta(ctx, updated)]);
      window.dispatchEvent(new CustomEvent('sc:conta-receber-atualizada', { detail: updated }));
      return { ok: true };
    } catch (err) {
      upsertContaStore(conta);
      getBaixasConta(contaId).forEach((b) => syncBaixaStore(b));
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

    const baixasRestantes = getBaixasConta(contaId).filter((b) => b.id !== baixaId);
    const updated = buildContaFromBaixas(conta, baixasRestantes);

    setInFlight(contaId, true);
    upsertContaStore(updated);
    removeBaixaStore(baixaId);

    try {
      const ctx = getCtx();
      await Promise.all([deleteBaixa(ctx, baixaId), upsertConta(ctx, updated)]);
      window.dispatchEvent(new CustomEvent('sc:conta-receber-atualizada', { detail: updated }));
      return { ok: true };
    } catch (err) {
      upsertContaStore(conta);
      syncBaixaStore(baixa);
      return { ok: false, error: err instanceof Error ? err.message : 'Erro ao estornar baixa.' };
    } finally {
      setInFlight(contaId, false);
    }
  }

  return { registrarBaixa, marcarRecebido, marcarPendente, estornarBaixa, getBaixasConta };
}
