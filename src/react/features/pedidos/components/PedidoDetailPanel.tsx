import { useEffect, useState } from 'react';
import {
  listBaixas,
  listContas,
  registrarBaixaRpc
} from '../../contas-receber/services/contasReceberApi';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import type { Pedido, PedidoItem } from '../../../../types/domain';
import type { ContaReceber, ContaReceberBaixa } from '../../../../types/domain';
import { usePedidoMutations, usePedidoFinanceiroQuery } from '../hooks/usePedidosQuery';
import { PedidoItemsSection } from './PedidoItemsSection';
import { PedidoCancelConfirmModal } from './PedidoCancelConfirmModal';
import { PedidoBaixaModal } from './PedidoBaixaModal';
import { ACAO_LABEL, NEXT_STATUS, normalizePedStatus } from '../types';
import { FormError, StatusBadge, Button, Badge, LoadingState } from '../../../shared/ui';
import type { StatusBadgeTone } from '../../../shared/ui';
import { PedidoEntregaConfirmModal } from './PedidoEntregaConfirmModal';
import { PdvTrocaModal } from './PdvTrocaModal';

type Props = {
  pedido: Pedido;
};

const PGTO_LABEL: Record<string, string> = {
  a_vista: 'À vista',
  pix: 'PIX',
  boleto: 'Boleto',
  cartao: 'Cartão',
  cheque: 'Cheque'
};

const PRAZO_LABEL: Record<string, string> = {
  imediato: 'Imediato',
  '7d': '7 dias',
  '15d': '15 dias',
  '30d': '30 dias',
  '60d': '60 dias'
};

function fmtCurrency(v: number | null | undefined) {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseItens(pedido: Pedido): PedidoItem[] {
  if (Array.isArray(pedido.itens)) return pedido.itens as PedidoItem[];
  try {
    const parsed = JSON.parse(pedido.itens as string);
    return Array.isArray(parsed) ? (parsed as PedidoItem[]) : [];
  } catch {
    return [];
  }
}

function getValorRecebido(conta: ContaReceber | null): number {
  if (!conta) return 0;
  if (Number.isFinite(Number(conta.valor_recebido))) return Number(conta.valor_recebido);
  return conta.status === 'recebido' ? Number(conta.valor || 0) : 0;
}

function getValorEmAberto(conta: ContaReceber | null): number {
  if (!conta) return 0;
  if (Number.isFinite(Number(conta.valor_em_aberto))) return Number(conta.valor_em_aberto);
  return Math.max(0, Number(conta.valor || 0) - getValorRecebido(conta));
}

function formatDateTimeLabel(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('pt-BR');
}

function getContaStatusLabel(conta: ContaReceber | null): string {
  if (!conta) return 'Sem conta';
  const aberto = getValorEmAberto(conta);
  if (aberto <= 0 || conta.status === 'recebido') return 'Recebido';
  if (getValorRecebido(conta) > 0 || conta.status === 'parcial') return 'Parcial';
  return 'Pendente';
}

function getContaStatusTone(conta: ContaReceber | null): StatusBadgeTone {
  const label = getContaStatusLabel(conta);
  if (label === 'Recebido') return 'success';
  if (label === 'Parcial') return 'warning';
  return 'neutral';
}


export function PedidoDetailPanel({ pedido }: Props) {
  const {
    updateStatus,
    confirmarEntrega,
    cancelarPedido,
    reabrirPedido,
    gerarContaManual
  } = usePedidoMutations();
  const { data: financeiro, isLoading: isLoadingFinanceiro, refetch: refreshFinanceiro } = usePedidoFinanceiroQuery(pedido.id);

  const [showBaixaForm, setShowBaixaForm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showEntregaConfirm, setShowEntregaConfirm] = useState(false);
  const [isTrocaModalOpen, setIsTrocaModalOpen] = useState(false);
  const [baixaLoading, setBaixaLoading] = useState(false);
  const [baixaError, setBaixaError] = useState<string | null>(null);

  const status = normalizePedStatus(pedido.status);
  const nextStatus = NEXT_STATUS[status];
  const acaoLabel = ACAO_LABEL[status];
  const isDeliveryAction =
    nextStatus === 'entregue_aguardando_pagamento' || nextStatus === 'concluido';

  const isInFlight = 
    updateStatus.isPending || 
    confirmarEntrega.isPending || 
    cancelarPedido.isPending || 
    reabrirPedido.isPending || 
    gerarContaManual.isPending;

  const itens = parseItens(pedido);
  const conta = financeiro?.conta || null;
  const baixas = financeiro?.baixas || [];
  const valorRecebido = getValorRecebido(conta);
  const valorEmAberto = getValorEmAberto(conta);

  const session = useAuthStore((s) => s.session);
  const filialId = useFilialStore((s) => s.filialId);

  function buildCrCtx() {
    const cfg = getSupabaseConfig();
    return {
      url: cfg.url,
      key: cfg.key,
      token: session?.access_token ?? '',
      filialId: filialId ?? ''
    };
  }

  async function handleReceberTudo(contaId: string, valorEmAberto: number) {
    setBaixaLoading(true);
    setBaixaError(null);
    try {
      await registrarBaixaRpc(buildCrCtx(), {
        baixaId: `ped-det-${Date.now()}`,
        contaId,
        valor: valorEmAberto,
        recebidoEm: new Date().toISOString(),
        observacao: null
      });
      await refreshFinanceiro();
    } catch (e) {
      setBaixaError(e instanceof Error ? e.message : 'Erro ao registrar recebimento');
    } finally {
      setBaixaLoading(false);
    }
  }

  async function handleConfirmarBaixa(contaId: string, valor: number) {
    setBaixaLoading(true);
    setBaixaError(null);
    try {
      await registrarBaixaRpc(buildCrCtx(), {
        baixaId: `ped-det-${Date.now()}`,
        contaId,
        valor,
        recebidoEm: new Date().toISOString(),
        observacao: null
      });
      setShowBaixaForm(false);
      await refreshFinanceiro();
    } catch (e) {
      setBaixaError(e instanceof Error ? e.message : 'Erro ao registrar baixa');
    } finally {
      setBaixaLoading(false);
    }
  }

  if (isLoadingFinanceiro) {
    return <LoadingState />;
  }

  return (
    <div data-testid="pedido-detail-panel">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div>
          <div className="mb-1 text-sm font-medium text-slate-400">Cliente</div>
          <div className="text-sm font-semibold text-white">{pedido.cli || '—'}</div>
        </div>
        {pedido.rca_nome && (
          <div>
            <div className="mb-1 text-sm font-medium text-slate-400">Vendedor</div>
            <div className="text-sm font-semibold text-white">{pedido.rca_nome}</div>
          </div>
        )}
        <div>
          <div className="mb-1 text-sm font-medium text-slate-400">Tipo</div>
          <div className="text-sm font-semibold text-white">{pedido.tipo === 'atacado' ? 'Atacado' : 'Varejo'}</div>
        </div>
        <div>
          <div className="mb-1 text-sm font-medium text-slate-400">Pagamento</div>
          <div className="text-sm font-semibold text-white">{PGTO_LABEL[pedido.pgto ?? ''] ?? pedido.pgto ?? '—'}</div>
        </div>
        <div>
          <div className="mb-1 text-sm font-medium text-slate-400">Prazo</div>
          <div className="text-sm font-semibold text-white">{PRAZO_LABEL[pedido.prazo ?? ''] ?? pedido.prazo ?? '—'}</div>
        </div>
        {pedido.obs && (
          <div className="sm:col-span-2 lg:col-span-3">
            <div className="mb-1 text-sm font-medium text-slate-400">Obs.</div>
            <div className="text-sm text-slate-300 bg-white/5 p-3 rounded-lg border border-white/5">{pedido.obs}</div>
          </div>
        )}
      </div>

      <PedidoItemsSection 
        itens={itens} 
        produtos={[]} 
        tipo={pedido.tipo ?? 'varejo'} 
        custoFrete={pedido.custo_frete}
        outrosCustos={pedido.outros_custos}
        readOnly 
      />

      <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-sm mt-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-500 rounded-full" />
          Financeiro do pedido
        </h3>
        {conta ? (
          <>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <StatusBadge tone={getContaStatusTone(conta)}>
                {getContaStatusLabel(conta)}
              </StatusBadge>
              <Badge variant="slate">Vencimento {conta.vencimento}</Badge>
              <Badge variant="blue">Total {fmtCurrency(conta.valor)}</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 bg-white/5 p-4 rounded-xl border border-white/5">
              <div>
                <div className="mb-0.5 text-sm font-medium text-slate-400">Recebido</div>
                <div className="text-sm font-bold text-emerald-400">{fmtCurrency(valorRecebido)}</div>
              </div>
              <div>
                <div className="mb-0.5 text-sm font-medium text-slate-400">Em aberto</div>
                <div className={`text-sm font-bold${valorEmAberto > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {fmtCurrency(valorEmAberto)}
                </div>
              </div>
              <div>
                <div className="mb-0.5 text-sm font-medium text-slate-400">Última baixa</div>
                <div className="text-sm font-semibold text-slate-300">
                  {formatDateTimeLabel(conta.ultimo_recebimento_em || conta.recebido_em)}
                </div>
              </div>
            </div>

            {valorEmAberto > 0 && (
              <>
                <div className="flex items-center gap-3 mt-4">
                  <Button
                    variant="secondary"
                    disabled={baixaLoading}
                    onClick={() => {
                      setBaixaError(null);
                      setShowBaixaForm(true);
                    }}
                    data-testid="pedido-detail-baixa-parcial"
                  >
                    Baixa parcial
                  </Button>
                  <Button
                    variant="primary"
                    disabled={baixaLoading}
                    onClick={() => void handleReceberTudo(conta.id, valorEmAberto)}
                    data-testid="pedido-detail-receber-tudo"
                  >
                    {baixaLoading ? 'Recebendo…' : 'Receber tudo'}
                  </Button>
                </div>
                <FormError message={baixaError} data-testid="pedido-detail-baixa-error" />
              </>
            )}

            <div className="mt-8">
              <div className="mb-4 text-sm font-medium text-slate-400">Últimas baixas</div>
              {baixas.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {baixas.slice(0, 4).map((baixa) => (
                    <div key={baixa.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-white">
                          {fmtCurrency(baixa.valor)}
                        </span>
                        <span className="text-xs text-slate-400">{formatDateTimeLabel(baixa.recebido_em)}</span>
                      </div>
                      {baixa.observacao && (
                        <div className="text-xs text-slate-400 italic mt-1">
                          {baixa.observacao}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-4 italic">
                  Nenhuma baixa registrada ainda.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="rf-ui-stack" style={{ marginTop: '0.5rem' }}>
             <p className="table-cell-muted">Nenhuma conta a receber vinculada a este pedido no momento.</p>
             {status === 'entregue_aguardando_pagamento' && (
                <Button
                    variant="primary"
                    disabled={gerarContaManual.isPending}
                    onClick={() => {
                        gerarContaManual.mutate(pedido);
                    }}
                    data-testid="pedido-detail-gerar-conta"
                >
                    {gerarContaManual.isPending ? 'Gerando…' : 'Gerar conta a receber'}
                </Button>
             )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 justify-end mt-8 pt-6 border-t border-white/5">
        {status === 'concluido' && (
          <Button
            variant="secondary"
            onClick={() => setIsTrocaModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            Trocar / Devolver Peças
          </Button>
        )}
        {nextStatus && acaoLabel && (
          <Button
            variant="primary"
            disabled={isInFlight}
            onClick={() => {
              if (isDeliveryAction) {
                setShowEntregaConfirm(true);
                return;
              }
              updateStatus.mutate({ id: pedido.id, status: nextStatus });
            }}
            data-testid="pedido-detail-avancar"
          >
            {isInFlight ? 'Aguarde…' : acaoLabel}
          </Button>
        )}
        {status !== 'cancelado' && (
          <Button
            variant="danger"
            disabled={isInFlight}
            onClick={() => setShowCancelConfirm(true)}
            data-testid="pedido-detail-cancelar"
          >
            Cancelar
          </Button>
        )}
        {status === 'cancelado' && (
          <Button
            variant="secondary"
            disabled={isInFlight}
            onClick={() => reabrirPedido.mutate(pedido)}
            data-testid="pedido-detail-reabrir"
          >
            Reabrir
          </Button>
        )}
      </div>

      <PedidoCancelConfirmModal
        open={showCancelConfirm}
        pedido={pedido}
        submitting={cancelarPedido.isPending}
        onClose={() => {
          if (!cancelarPedido.isPending) setShowCancelConfirm(false);
        }}
        onConfirm={(isRecusaAvaria) => {
          cancelarPedido.mutate({ pedido, isRecusaAvaria }, {
            onSuccess: () => setShowCancelConfirm(false)
          });
        }}
      />
      <PedidoEntregaConfirmModal
        open={showEntregaConfirm}
        pedido={pedido}
        submitting={confirmarEntrega.isPending}
        onClose={() => {
          if (!confirmarEntrega.isPending) setShowEntregaConfirm(false);
        }}
        onConfirm={() => {
          confirmarEntrega.mutate(pedido.id, {
            onSuccess: () => {
                setShowEntregaConfirm(false);
                void refreshFinanceiro();
            }
          });
        }}
      />
      <PedidoBaixaModal
        open={showBaixaForm}
        submitting={baixaLoading}
        valorEmAberto={valorEmAberto}
        error={baixaError}
        onClose={() => {
          if (!baixaLoading) {
            setShowBaixaForm(false);
            setBaixaError(null);
          }
        }}
        onConfirm={(valor) => {
          if (conta) void handleConfirmarBaixa(conta.id, valor);
        }}
      />
      <PdvTrocaModal
        open={isTrocaModalOpen}
        onClose={() => setIsTrocaModalOpen(false)}
        pedido={pedido}
      />
    </div>
  );
}
