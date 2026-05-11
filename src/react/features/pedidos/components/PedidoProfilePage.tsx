import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { ContaReceber, ContaReceberBaixa, Pedido, PedidoItem } from '../../../../types/domain';
import { useRoleStore } from '../../../app/useRoleStore';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui';
import type { PedidoFinanceiroState } from '../hooks/usePedidoProfile';
import { usePedidoMutations } from '../hooks/usePedidoMutations';
import {
  ACAO_LABEL,
  NEXT_STATUS,
  PEDIDO_STATUS_LABEL,
  PEDIDO_STATUS_TONE,
  normalizePedStatus
} from '../types';
import { PedidoCancelConfirmModal } from './PedidoCancelConfirmModal';
import { PedidoEntregaConfirmModal } from './PedidoEntregaConfirmModal';
import { PedidoItensTab } from './PedidoItensTab';

type PedidoProfileTab = 'itens' | 'financeiro' | 'historico' | 'cadastro';

type Props = {
  pedido: Pedido;
  financeiro: PedidoFinanceiroState;
  loadingPedido?: boolean;
  error?: string | null;
  onPedidoChanged?: (pedido: Pedido) => void;
  onReload?: () => Promise<Pedido | null>;
  onReloadFinanceiro?: () => Promise<void>;
};

type KpiCard = {
  label: string;
  value: string;
  subtitle: string;
  tone?: 'positive' | 'negative' | 'neutral';
};

const PROFILE_TABS: Array<{ id: PedidoProfileTab; label: string }> = [
  { id: 'itens', label: 'Itens' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'historico', label: 'Histórico' },
  { id: 'cadastro', label: 'Cadastro' }
];

const EDITABLE_ITEM_STATUSES = new Set(['em_andamento', 'em_separacao', 'pago_aguardando_entrega']);

const PGTO_LABEL: Record<string, string> = {
  a_vista: 'À vista',
  pix: 'PIX',
  boleto: 'Boleto',
  cartao: 'Cartão',
  cheque: 'Cheque',
  misto: 'Misto'
};

const PRAZO_LABEL: Record<string, string> = {
  imediato: 'Imediato',
  '7d': '7 dias',
  '15d': '15 dias',
  '30d': '30 dias',
  '60d': '60 dias'
};

function normalizeTab(value: string | null): PedidoProfileTab {
  return PROFILE_TABS.some((tab) => tab.id === value) ? (value as PedidoProfileTab) : 'itens';
}

function formatCurrency(value?: number | null): string {
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const parts = value.slice(0, 10).split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('pt-BR');
}

function getInitials(value: string) {
  const source = value.trim() || 'Pedido';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
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

function getContaStatusLabel(conta: ContaReceber | null): string {
  if (!conta) return 'Sem conta';
  const aberto = getValorEmAberto(conta);
  if (aberto <= 0 || conta.status === 'recebido') return 'Recebido';
  if (getValorRecebido(conta) > 0 || conta.status === 'parcial') return 'Parcial';
  return 'Pendente';
}

function buildKpis(pedido: Pedido, itens: PedidoItem[], conta: ContaReceber | null): KpiCard[] {
  const quantidade = itens.reduce((total, item) => total + Number(item.qty || 0), 0);
  const valorEmAberto = getValorEmAberto(conta);
  const status = normalizePedStatus(pedido.status);

  return [
    {
      label: 'Total',
      value: formatCurrency(pedido.total),
      subtitle: `${itens.length} item(ns) · ${quantidade || 0} unidade(s)`
    },
    {
      label: 'Status',
      value: PEDIDO_STATUS_LABEL[status] || status || '—',
      subtitle: pedido.venda_fechada ? 'Venda fechada' : 'Fluxo comercial',
      tone: status === 'cancelado' ? 'negative' : status === 'concluido' ? 'positive' : 'neutral'
    },
    {
      label: 'Pagamento',
      value: PGTO_LABEL[pedido.pgto ?? ''] ?? pedido.pgto ?? '—',
      subtitle: PRAZO_LABEL[pedido.prazo ?? ''] ?? pedido.prazo ?? 'Sem prazo'
    },
    {
      label: 'Em aberto',
      value: formatCurrency(valorEmAberto),
      subtitle: getContaStatusLabel(conta),
      tone: valorEmAberto > 0 ? 'negative' : conta ? 'positive' : 'neutral'
    }
  ];
}

function InfoTable({ rows }: { rows: Array<{ label: string; value: string | null | undefined }> }) {
  return (
    <div className="flex flex-col divide-y divide-slate-100">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col sm:flex-row sm:justify-between py-3 gap-1">
          <span className="text-sm text-slate-500 font-medium">{row.label}</span>
          <span
            className={`text-sm text-right ${
              row.value ? 'text-slate-900 font-medium' : 'text-slate-400'
            }`}
          >
            {row.value || '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

function BaixasTable({ baixas }: { baixas: ContaReceberBaixa[] }) {
  if (!baixas.length) return <EmptyState title="Nenhuma baixa registrada." compact />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-600">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
            <th className="py-3 pr-4 font-medium">Valor</th>
            <th className="py-3 pr-4 font-medium">Recebido em</th>
            <th className="py-3 font-medium">Observação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {baixas.map((baixa) => (
            <tr key={baixa.id} className="hover:bg-slate-50 transition-colors">
              <td className="py-3 pr-4 font-medium text-slate-900">{formatCurrency(baixa.valor)}</td>
              <td className="py-3 pr-4">{formatDateTime(baixa.recebido_em)}</td>
              <td className="py-3">{baixa.observacao || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PedidoProfilePage({
  pedido,
  financeiro,
  loadingPedido = false,
  error,
  onPedidoChanged,
  onReload,
  onReloadFinanceiro
}: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const userRole = useRoleStore((state) => state.role);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showEntregaConfirm, setShowEntregaConfirm] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const {
    avancarStatus,
    confirmarEntrega,
    cancelarPedido,
    reabrirPedido,
    gerarContaManual,
    inFlight
  } = usePedidoMutations();

  const activeTab = normalizeTab(searchParams.get('tab'));
  const status = normalizePedStatus(pedido.status);
  const statusTone = PEDIDO_STATUS_TONE[status] ?? 'neutral';
  const nextStatus = NEXT_STATUS[status];
  const acaoLabel = ACAO_LABEL[status];
  const isDeliveryAction =
    nextStatus === 'entregue_aguardando_pagamento' || nextStatus === 'concluido';
  const isInFlight = inFlight.has(pedido.id);
  const itens = useMemo(() => parseItens(pedido), [pedido]);
  const canEditItens = userRole === 'admin' && EDITABLE_ITEM_STATUSES.has(status);
  const kpis = useMemo(
    () => buildKpis(pedido, itens, financeiro.conta),
    [financeiro.conta, itens, pedido]
  );

  function setTab(tab: PedidoProfileTab) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (tab === 'itens') next.delete('tab');
      else next.set('tab', tab);
      return next;
    });
  }

  function updateLocalStatus(next: string) {
    onPedidoChanged?.({ ...pedido, status: next });
  }

  async function handleAvancar() {
    if (!nextStatus) return;
    if (isDeliveryAction) {
      setShowEntregaConfirm(true);
      return;
    }
    await avancarStatus(pedido);
    updateLocalStatus(nextStatus);
  }

  async function handleConfirmarEntrega() {
    const updated = await confirmarEntrega(pedido);
    if (updated) onPedidoChanged?.(updated);
    setShowEntregaConfirm(false);
    void onReloadFinanceiro?.();
  }

  async function handleCancelar() {
    await cancelarPedido(pedido);
    updateLocalStatus('cancelado');
    setShowCancelConfirm(false);
  }

  async function handleReabrir() {
    await reabrirPedido(pedido);
    updateLocalStatus('orcamento');
  }

  async function handleGerarConta() {
    setActionMessage(null);
    const msg = await gerarContaManual(pedido);
    setActionMessage(msg);
    void onReloadFinanceiro?.();
  }

  if (loadingPedido) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex flex-col gap-6">
        <LoadingState
          title="Carregando pedido..."
          description="Estamos reunindo itens, financeiro, histórico e cadastro do pedido."
        />
      </main>
    );
  }

  return (
    <main
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex flex-col gap-6"
      data-testid="pedido-profile-page"
    >
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button
          className="hover:text-slate-900 transition-colors"
          type="button"
          onClick={() => navigate('/app/pedidos')}
        >
          Voltar
        </button>
        <span>/ Pedidos / #{pedido.num}</span>
      </div>

      {error ? <ErrorState title={error} compact onRetry={onReload} /> : null}

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6">
        <div className="flex items-center gap-5 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-xl font-bold shadow-inner shrink-0">
            {getInitials(pedido.cli)}
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 leading-tight m-0">Pedido #{pedido.num}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                ${statusTone === 'success' ? 'bg-emerald-100 text-emerald-800' : ''}
                ${statusTone === 'danger' ? 'bg-rose-100 text-rose-800' : ''}
                ${statusTone === 'warning' ? 'bg-amber-100 text-amber-800' : ''}
                ${statusTone === 'info' ? 'bg-blue-100 text-blue-800' : ''}
                ${statusTone === 'neutral' ? 'bg-slate-100 text-slate-700' : ''}
                ${!['success', 'danger', 'warning', 'info', 'neutral'].includes(statusTone) ? 'bg-slate-100 text-slate-700' : ''}
              `}>
                {PEDIDO_STATUS_LABEL[status] || status || '—'}
              </span>
              {pedido.tipo ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                  {pedido.tipo === 'atacado' ? 'Atacado' : 'Varejo'}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-slate-500 m-0">
              {pedido.cli || 'Cliente não informado'} · {formatDate(pedido.data)} ·{' '}
              {pedido.rca_nome || 'Sem vendedor'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap md:justify-end shrink-0">
          {nextStatus && acaoLabel ? (
            <button
              className="btn btn-sm btn-p"
              type="button"
              disabled={isInFlight}
              onClick={() => void handleAvancar()}
            >
              {isInFlight ? 'Aguarde…' : acaoLabel}
            </button>
          ) : null}
          {status === 'cancelado' ? (
            <button
              className="btn btn-sm"
              type="button"
              disabled={isInFlight}
              onClick={() => void handleReabrir()}
            >
              Reabrir
            </button>
          ) : null}
          {status !== 'cancelado' && status !== 'concluido' ? (
            <button
              className="btn btn-sm btn-r"
              type="button"
              disabled={isInFlight}
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancelar
            </button>
          ) : null}
          <button
            className="btn btn-sm"
            type="button"
            onClick={() =>
              navigate(`/app/pedidos?pedido=${encodeURIComponent(pedido.id)}&view=edit`)
            }
          >
            Editar
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((card) => (
          <article key={card.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="text-sm font-medium text-slate-500 mb-1">{card.label}</div>
            <div className="text-2xl font-bold text-slate-900 leading-tight">{card.value}</div>
            <div
              className={`text-xs mt-2 font-medium ${
                card.tone === 'positive' ? 'text-emerald-600' :
                card.tone === 'negative' ? 'text-rose-600' :
                'text-slate-500'
              }`}
            >
              {card.subtitle}
            </div>
          </article>
        ))}
      </section>

      <div className="inline-flex items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 shadow-inner w-full md:w-auto self-start overflow-x-auto hide-scrollbar">
        {PROFILE_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`
                relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap
                ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }
              `}
              type="button"
              onClick={() => setTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'itens' ? (
        <section className="flex flex-col gap-4">
          <PedidoItensTab
            pedido={pedido}
            itens={itens}
            canEdit={canEditItens}
            onPedidoChanged={onPedidoChanged}
          />
        </section>
      ) : null}

      {activeTab === 'financeiro' ? (
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-6">
            <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 m-0">Contas a receber vinculadas</h3>
                  <p className="text-sm text-slate-500 mt-1 mb-0">
                    Leitura da conta a receber relacionada ao pedido.
                  </p>
                </div>
                {status === 'entregue_aguardando_pagamento' && !financeiro.conta ? (
                  <button
                    className="btn btn-sm btn-p"
                    type="button"
                    disabled={isInFlight}
                    onClick={() => void handleGerarConta()}
                  >
                    {isInFlight ? 'Gerando…' : 'Gerar conta'}
                  </button>
                ) : null}
              </div>
              {financeiro.loading ? (
                <LoadingState title="Carregando financeiro..." compact />
              ) : financeiro.error ? (
                <ErrorState title={financeiro.error} compact onRetry={onReloadFinanceiro} />
              ) : financeiro.conta ? (
                <InfoTable
                  rows={[
                    { label: 'Status', value: getContaStatusLabel(financeiro.conta) },
                    { label: 'Vencimento', value: formatDate(financeiro.conta.vencimento) },
                    { label: 'Valor', value: formatCurrency(financeiro.conta.valor) },
                    {
                      label: 'Recebido',
                      value: formatCurrency(getValorRecebido(financeiro.conta))
                    },
                    {
                      label: 'Em aberto',
                      value: formatCurrency(getValorEmAberto(financeiro.conta))
                    },
                    {
                      label: 'Último recebimento',
                      value: formatDateTime(
                        financeiro.conta.ultimo_recebimento_em || financeiro.conta.recebido_em
                      )
                    }
                  ]}
                />
              ) : (
                <EmptyState title="Nenhuma conta a receber vinculada." compact />
              )}
              {actionMessage ? <p className="text-sm text-slate-500">{actionMessage}</p> : null}
            </section>
          </div>
        </section>
      ) : null}

      {activeTab === 'historico' ? (
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-6">
            <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center gap-4">
                <h3 className="text-sm font-semibold text-slate-900 m-0">Histórico do pedido</h3>
              </div>
              <InfoTable
                rows={[
                  { label: 'Criado/data', value: formatDate(pedido.data) },
                  { label: 'Venda fechada', value: pedido.venda_fechada ? 'Sim' : 'Não' },
                  { label: 'Fechada em', value: formatDateTime(pedido.venda_fechada_em) },
                  { label: 'Fechada por', value: pedido.venda_fechada_por },
                  { label: 'Entrega confirmada em', value: formatDateTime(pedido.entregue_em) },
                  { label: 'Entrega confirmada por', value: pedido.entregue_por },
                  { label: 'Status atual', value: PEDIDO_STATUS_LABEL[status] || status }
                ]}
              />
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center gap-4">
                <h3 className="text-sm font-semibold text-slate-900 m-0">Baixas financeiras</h3>
              </div>
              {financeiro.loading ? (
                <LoadingState title="Carregando baixas..." compact />
              ) : (
                <BaixasTable baixas={financeiro.baixas} />
              )}
            </section>
          </div>
        </section>
      ) : null}

      {activeTab === 'cadastro' ? (
        <section className="flex flex-col gap-6">
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 m-0">Cadastro do pedido</h3>
                <p className="text-sm text-slate-500 mt-1 mb-0">
                  Dados brutos principais disponíveis na origem atual.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mt-2">
              <InfoTable
                rows={[
                  { label: 'ID', value: pedido.id },
                  { label: 'Número', value: String(pedido.num) },
                  { label: 'Filial', value: pedido.filial_id },
                  { label: 'Cliente', value: pedido.cli },
                  { label: 'Cliente ID', value: pedido.cliente_id },
                  { label: 'Vendedor', value: pedido.rca_nome }
                ]}
              />
              <InfoTable
                rows={[
                  { label: 'RCA ID', value: pedido.rca_id },
                  { label: 'Status', value: PEDIDO_STATUS_LABEL[status] || status },
                  { label: 'Pagamento', value: PGTO_LABEL[pedido.pgto ?? ''] ?? pedido.pgto },
                  { label: 'Prazo', value: PRAZO_LABEL[pedido.prazo ?? ''] ?? pedido.prazo },
                  { label: 'Tipo', value: pedido.tipo },
                  { label: 'Origem', value: pedido.origem_venda }
                ]}
              />
            </div>
          </section>
        </section>
      ) : null}

      <PedidoCancelConfirmModal
        open={showCancelConfirm}
        pedido={pedido}
        submitting={isInFlight}
        onClose={() => {
          if (!isInFlight) setShowCancelConfirm(false);
        }}
        onConfirm={() => void handleCancelar()}
      />
      <PedidoEntregaConfirmModal
        open={showEntregaConfirm}
        pedido={pedido}
        submitting={isInFlight}
        onClose={() => {
          if (!isInFlight) setShowEntregaConfirm(false);
        }}
        onConfirm={() => void handleConfirmarEntrega()}
      />
    </main>
  );
}
