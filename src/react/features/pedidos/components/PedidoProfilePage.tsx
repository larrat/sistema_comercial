import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

import type { ContaReceber, Pedido, PedidoItem } from '../../../../types/domain';
import { useRoleStore } from '../../../app/useRoleStore';
import { EmptyState, LoadingState, StatusBadge, Button } from '../../../shared/ui';
import { usePedidoMutations, type PedidoFinanceiroState } from '../hooks/usePedidosQuery';
import { useContasReceberMutations } from '../../contas-receber/hooks/useContasReceberMutations';
import { ContaReceberConfirmModal } from '../../contas-receber/components/ContaReceberConfirmModal';
import {
  PEDIDO_STATUS_LABEL,
  PEDIDO_STATUS_TONE,
  normalizePedStatus
} from '../types';
import { PedidoCancelConfirmModal } from './PedidoCancelConfirmModal';
import { PedidoItensTab } from './PedidoItensTab';
import { PedidoTimeline, type TimelineEvent } from './PedidoTimeline';
import {
  calculatePedidoLucroTotal,
  calculatePedidoTotal,
  formatPedidoCurrency
} from '../utils/pedidoRules';
import { toast } from 'sonner';

type PedidoProfileTab = 'itens' | 'financeiro' | 'historico' | 'cadastro';

type Props = {
  pedido: Pedido;
  financeiro: PedidoFinanceiroState;
  onPedidoChanged?: (pedido: Pedido) => void;
  onReloadFinanceiro?: () => Promise<void>;
};

const PROFILE_TABS: Array<{ id: PedidoProfileTab; label: string }> = [
  { id: 'itens', label: 'Itens' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'historico', label: 'Histórico' },
  { id: 'cadastro', label: 'Cadastro' }
];

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

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const parts = value.slice(0, 10).split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getInitials(value: string) {
  const source = value.trim() || 'Pedido';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-blue-500/10 text-blue-400',
    'bg-emerald-500/10 text-emerald-400',
    'bg-indigo-500/10 text-indigo-400',
    'bg-purple-500/10 text-purple-400',
    'bg-amber-500/10 text-amber-400',
    'bg-rose-500/10 text-rose-400',
    'bg-slate-500/10 text-slate-400'
  ];
  const charCode = (name || '').charCodeAt(0) || 0;
  return colors[charCode % colors.length];
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

function getValorEmAberto(conta: ContaReceber | null): number {
  if (!conta) return 0;
  if (Number.isFinite(Number(conta.valor_em_aberto))) return Number(conta.valor_em_aberto);
  const recebido = Number(conta.valor_recebido || 0);
  return Math.max(0, Number(conta.valor || 0) - recebido);
}

export function PedidoProfilePage({
  pedido,
  financeiro,
  onPedidoChanged,
  onReloadFinanceiro
}: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const userRole = useRoleStore((state) => state.role);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showBaixaConfirm, setShowBaixaConfirm] = useState(false);
  const { updateStatus } = usePedidoMutations();
  const { registrarBaixa } = useContasReceberMutations();

  const activeTab = normalizeTab(searchParams.get('tab'));
  const status = normalizePedStatus(pedido.status);
  const statusTone = PEDIDO_STATUS_TONE[status] ?? 'neutral';
  
  const itens = useMemo(() => parseItens(pedido), [pedido]);
  const total = calculatePedidoTotal(itens);
  const lucroTotal = calculatePedidoLucroTotal(itens);
  const margemTotal = total > 0 ? (lucroTotal / total) * 100 : 0;
  const valorEmAberto = getValorEmAberto(financeiro.conta);

  function setTab(tab: PedidoProfileTab) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (tab === 'itens') next.delete('tab');
      else next.set('tab', tab);
      return next;
    });
  }

  async function handleCancelar() {
    updateStatus.mutate({ id: pedido.id, status: 'cancelado' }, {
      onSuccess: () => {
        setShowCancelConfirm(false);
      }
    });
  }

  async function handleConfirmarBaixa() {
    if (!financeiro.conta) return;
    const aberto = getValorEmAberto(financeiro.conta);
    const result = await registrarBaixa(
      financeiro.conta.id,
      aberto,
      new Date().toISOString(),
      'Baixa via detalhe do pedido'
    );
    if (result.ok) {
      toast.success('Baixa registrada com sucesso!');
      void onReloadFinanceiro?.();
      setShowBaixaConfirm(false);
    }
  }

  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [
      {
        id: 'create',
        title: 'Pedido criado',
        timestamp: pedido.data,
        isDone: true
      }
    ];

    if (pedido.venda_fechada_em) {
      events.push({
        id: 'closed',
        title: 'Venda fechada',
        timestamp: pedido.venda_fechada_em,
        user: pedido.venda_fechada_por,
        isDone: true
      });
    }

    if (pedido.entregue_em) {
      events.push({
        id: 'delivery',
        title: 'Marcado como entregue',
        timestamp: pedido.entregue_em,
        user: pedido.entregue_por,
        isDone: true
      });
    }

    financeiro.baixas.forEach(baixa => {
      events.push({
        id: baixa.id,
        title: 'Pagamento baixado',
        timestamp: baixa.recebido_em,
        description: baixa.observacao,
        isDone: true
      });
    });

    if (status === 'concluido') {
      events.push({
        id: 'concluido',
        title: 'Pedido concluído',
        timestamp: financeiro.conta?.recebido_em || pedido.entregue_em || null,
        isDone: true
      });
    } else if (status === 'cancelado') {
      events.push({
        id: 'cancelado',
        title: 'Pedido cancelado',
        timestamp: new Date().toISOString(), // Fallback
        isDone: true
      });
    } else {
      events.push({
        id: 'pending',
        title: 'Aguardando próximo evento',
        timestamp: null,
        isDone: false
      });
    }

    return events.sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [pedido, financeiro, status]);

  return (
    <div className="w-full flex flex-col gap-8" data-testid="pedido-profile-page">
      {/* Topbar / Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <Link to="/app/pedidos" className="flex items-center gap-1.5 hover:text-white transition-colors">
            <span className="text-base">←</span> Pedidos
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-white font-semibold">#{pedido.num}</span>
        </div>
        <div className="flex items-center gap-3">
          {status !== 'cancelado' && status !== 'concluido' && (
            <Button size="sm" onClick={() => setShowCancelConfirm(true)}>
              Cancelar pedido
            </Button>
          )}
          {['orcamento', 'confirmado', 'em_separacao'].includes(status) && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/app/pedidos?pedido=${encodeURIComponent(pedido.id)}&view=edit`)}
            >
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Header */}
      <section className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${getAvatarColor(pedido.cli)}`}>
          {getInitials(pedido.cli)}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-white m-0">Pedido #{pedido.num}</h1>
            <StatusBadge tone={statusTone}>
              {PEDIDO_STATUS_LABEL[status] || status}
            </StatusBadge>
            {pedido.tipo && (
              <StatusBadge tone="neutral">
                {pedido.tipo === 'atacado' ? 'Atacado' : 'Varejo'}
              </StatusBadge>
            )}
          </div>
          <div className="text-sm text-slate-400 font-medium">
            {pedido.cli} · {formatDate(pedido.data)} · {pedido.rca_nome || 'Sem vendedor'}
          </div>
        </div>
      </section>

      {/* Stat Cards */}
      <section className="rf-kpi-grid">
        <article className="rf-kpi-card">
          <span className="rf-kpi-label">Total do pedido</span>
          <span className="rf-kpi-value">{formatPedidoCurrency(total)}</span>
          <span className="rf-kpi-sub muted">{itens.length} item · {itens.reduce((acc, i) => acc + Number(i.qty), 0)} unidades</span>
        </article>
        <article className="rf-kpi-card">
          <span className="rf-kpi-label">Lucro</span>
          <span className="rf-kpi-value !text-emerald-400">{formatPedidoCurrency(lucroTotal)}</span>
          <span className="rf-kpi-sub success">Margem {margemTotal.toFixed(1)}%</span>
        </article>
        <article className="rf-kpi-card">
          <span className="rf-kpi-label">Pagamento</span>
          <span className="rf-kpi-value">
            {PGTO_LABEL[pedido.pgto ?? ''] ?? pedido.pgto} · {PRAZO_LABEL[pedido.prazo ?? ''] ?? pedido.prazo}
          </span>
          <span className="rf-kpi-sub muted">
            {pedido.prazo === 'imediato' ? 'À vista' : `Vence ${formatDate(financeiro.conta?.vencimento)}`}
          </span>
        </article>
        <article className="rf-kpi-card">
          <span className="rf-kpi-label">Em aberto</span>
          {financeiro.loading ? (
            <span className="rf-kpi-value animate-pulse text-slate-300">...</span>
          ) : (
            <>
              <span className={`rf-kpi-value ${valorEmAberto > 0 ? '!text-amber-400' : '!text-emerald-400'}`}>
                {formatPedidoCurrency(valorEmAberto)}
              </span>
              <span className={`rf-kpi-sub ${valorEmAberto > 0 ? 'warning' : 'success'}`}>
                {financeiro.conta ? (valorEmAberto > 0 ? 'Pendente' : 'Quitado') : 'Sem conta vinculada'}
              </span>
            </>
          )}
        </article>
      </section>

      {/* Tabs */}
      <nav className="rf-tabs-premium mb-0">
        {PROFILE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`rf-tab-item ${activeTab === tab.id ? 'is-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <section className="min-h-[400px]">
        {activeTab === 'itens' && (
          <div className="flex flex-col gap-6">
            <PedidoItensTab
              pedido={pedido}
              itens={itens}
              canEdit={userRole === 'admin' && ['orcamento', 'confirmado', 'em_separacao'].includes(status)}
              onPedidoChanged={onPedidoChanged}
            />
            
            <div className="bg-slate-900 border border-white/5 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-white m-0">Financeiro do pedido</h3>
                <div className="flex items-center gap-3">
                  {financeiro.conta ? (
                    <StatusBadge tone={valorEmAberto > 0 ? 'warning' : 'success'}>
                      {valorEmAberto > 0 ? '1 pendência' : 'Quitado'}
                    </StatusBadge>
                  ) : <StatusBadge tone="neutral">Sem conta vinculada</StatusBadge>}
                </div>
              </div>

              {financeiro.conta ? (
                <div className="flex justify-between items-center py-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-white">
                      {PGTO_LABEL[pedido.pgto ?? ''] ?? pedido.pgto} · {PRAZO_LABEL[pedido.prazo ?? ''] ?? pedido.prazo}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Vence {formatDate(financeiro.conta.vencimento)}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-base font-bold text-white">{formatPedidoCurrency(financeiro.conta.valor)}</span>
                      <StatusBadge tone={financeiro.conta.status === 'recebido' ? 'success' : 'warning'}>
                        {financeiro.conta.status === 'recebido' ? 'Baixado' : 'Em aberto'}
                      </StatusBadge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-slate-400">Nenhuma conta a receber vinculada a este pedido.</div>
              )}
            </div>

            <div className="bg-slate-900 border border-white/5 rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-white m-0 mb-6">Histórico</h3>
              <PedidoTimeline events={timelineEvents} />
            </div>
          </div>
        )}

        {activeTab === 'financeiro' && (
          <div className="bg-slate-900 border border-white/5 rounded-xl p-6 shadow-sm">
            {!financeiro.conta ? (
              <EmptyState title="Nenhuma conta vinculada." compact />
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">
                      {PGTO_LABEL[pedido.pgto ?? ''] ?? pedido.pgto} · {PRAZO_LABEL[pedido.prazo ?? ''] ?? pedido.prazo}
                    </span>
                    <span className="text-xs text-slate-500">Vencimento: {formatDate(financeiro.conta.vencimento)}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-white">{formatPedidoCurrency(financeiro.conta.valor)}</span>
                      <StatusBadge tone={valorEmAberto > 0 ? 'warning' : 'success'}>
                        {valorEmAberto > 0 ? 'Em aberto' : 'Liquidado'}
                      </StatusBadge>
                    </div>
                    {valorEmAberto > 0 && (
                      <Button variant="primary" size="sm" onClick={() => setShowBaixaConfirm(true)}>Baixar</Button>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 pt-4 bg-white/5 p-4 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total do pedido</span>
                    <span className="font-semibold text-white">{formatPedidoCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total recebido</span>
                    <span className="font-semibold text-emerald-600">{formatPedidoCurrency(total - valorEmAberto)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-white/5 pt-2 mt-2">
                    <span className="font-bold text-white">Total em aberto</span>
                    <span className={`font-bold ${valorEmAberto > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {formatPedidoCurrency(valorEmAberto)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="bg-slate-900 border border-white/5 rounded-xl p-8 shadow-sm">
            <PedidoTimeline events={timelineEvents} />
          </div>
        )}

        {activeTab === 'cadastro' && (
          <div className="bg-slate-900 border border-white/5 rounded-xl p-8 shadow-sm">
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 uppercase">Cliente</span>
                <Link to={`/app/clientes/${pedido.cliente_id}`} className="text-sm font-semibold text-blue-600 hover:underline">
                  {pedido.cli}
                </Link>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 uppercase">Vendedor</span>
                <span className="text-sm font-semibold text-white">{pedido.rca_nome || '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 uppercase">Tipo</span>
                <span className="text-sm font-semibold text-white">{pedido.tipo === 'atacado' ? 'Atacado' : 'Varejo'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 uppercase">Forma de pagamento</span>
                <span className="text-sm font-semibold text-white">{PGTO_LABEL[pedido.pgto ?? ''] ?? pedido.pgto}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 uppercase">Prazo</span>
                <span className="text-sm font-semibold text-white">{PRAZO_LABEL[pedido.prazo ?? ''] ?? pedido.prazo}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 uppercase">Data do pedido</span>
                <span className="text-sm font-semibold text-white">{formatDate(pedido.data)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 uppercase">Criado por</span>
                <span className="text-sm font-semibold text-white">{pedido.venda_fechada_por || '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500 uppercase">Observação</span>
                <span className="text-sm text-slate-300">{pedido.obs || '—'}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Modals */}
      <PedidoCancelConfirmModal
        open={showCancelConfirm}
        pedido={pedido}
        submitting={updateStatus.isPending}
        onClose={() => !updateStatus.isPending && setShowCancelConfirm(false)}
        onConfirm={handleCancelar}
      />

      {financeiro.conta && (
        <ContaReceberConfirmModal
          open={showBaixaConfirm}
          title={`Liquidar pedido #${pedido.num}`}
          description="Confirmar o recebimento total deste pedido? A conta será baixada e o status do pedido atualizado para concluído."
          contaLabel={`${pedido.cli} — Pedido #${pedido.num}`}
          valorLabel={formatPedidoCurrency(valorEmAberto)}
          confirmLabel="Confirmar recebimento"
          submitting={registrarBaixa.isPending}
          onClose={() => !registrarBaixa.isPending && setShowBaixaConfirm(false)}
          onConfirm={handleConfirmarBaixa}
        />
      )}
    </div>
  );
}
