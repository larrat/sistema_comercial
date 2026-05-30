import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Cliente, ContaReceber, Pedido } from '../../../../types/domain';
import {
  buildClienteRoute,
  buildPedidosRoute,
  buildReceberRoute,
  type ClienteProfileTab
} from '../../../app/router/wave1Navigation';
import {
  ActionMenu,
  EmptyState,
  ErrorState,
  FormError,
  LoadingState,
  Button,
  Badge
} from '../../../shared/ui';
import { SystemBarChart } from '../../../app/components/charts';
import { ClienteForm } from './ClienteForm';
import { useClientePedidos } from '../hooks/useClientePedidos';
import { useClienteReceber } from '../hooks/useClienteReceber';
import { useClienteNotes } from '../hooks/useClienteNotes';
import { 
  User, 
  MessageSquare, 
  PlusCircle, 
  MoreHorizontal, 
  Clock, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  ArrowLeft,
  ChevronLeft,
  Share2,
  Database,
  History,
  Zap,
  Package,
  ArrowUpRight,
  ShieldCheck,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tooltip from '@radix-ui/react-tooltip';
import ReactCountUp from 'react-countup';
const CountUp = (ReactCountUp as any).default || ReactCountUp;

type Props = {
  cliente: Cliente;
  loadingCliente?: boolean;
  onClienteSaved?: (cliente: Cliente) => void;
  onReload?: () => void;
};

type KpiCard = {
  label: string;
  value: string;
  subtitle: string;
  tone?: 'positive' | 'negative' | 'neutral';
};

const PROFILE_TABS: Array<{ id: ClienteProfileTab; label: string }> = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'notas', label: 'Notas' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'cadastro', label: 'Cadastro' }
];

function normalizeTab(value: string | null): ClienteProfileTab {
  return PROFILE_TABS.some((tab) => tab.id === value) ? (value as ClienteProfileTab) : 'resumo';
}

function formatCurrency(value: number): string {
  return Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

function formatCompactDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short'
  }).format(date);
}

function formatMonthYear(value?: string | null): string {
  if (!value) return 'Sem histórico';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function formatDateLong(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function formatPrazoLabel(value?: string | null): string {
  if (!value) return 'À vista';
  if (value === 'a_vista' || value === 'imediato') return 'À vista';
  if (value.endsWith('d')) return `${value.replace('d', '')}d`;
  return value;
}

function getInitials(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function getWhatsappLink(cliente: Cliente): string | null {
  const raw = cliente.whatsapp || cliente.tel || '';
  const digits = raw.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

function getPedidoStatusPill(status?: string | null): string {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'separacao' || normalized === 'separação') return 'warning';
  if (normalized === 'rota') return 'info';
  if (normalized.includes('aguarda')) return 'purple';
  if (normalized === 'cancelado') return 'danger';
  if (normalized === 'entregue') return 'success';
  return 'neutral';
}

function getContaStatus(conta: ContaReceber): 'vencida' | 'a_vencer' | 'recebida' {
  const aberto = getContaValorEmAberto(conta);
  if (aberto <= 0) return 'recebida';
  const hoje = new Date().toISOString().slice(0, 10);
  return conta.vencimento < hoje ? 'vencida' : 'a_vencer';
}

function getContaValorEmAberto(conta: ContaReceber): number {
  if (typeof conta.valor_em_aberto === 'number') return Number(conta.valor_em_aberto || 0);
  const valor = Number(conta.valor || 0);
  const recebido = Number(conta.valor_recebido || 0);
  return Math.max(0, valor - recebido);
}

function sortPedidosByDateDesc(items: Pedido[]): Pedido[] {
  return [...items].sort((a, b) => {
    const aDate = new Date(a.data || '').getTime() || 0;
    const bDate = new Date(b.data || '').getTime() || 0;
    return bDate - aDate || Number(b.num || 0) - Number(a.num || 0);
  });
}

function buildPurchaseSeries(pedidos: Pedido[]) {
  const months: Array<{ key: string; label: string; total: number; count: number }> = [];
  const now = new Date();
  for (let index = 11; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      key,
      label: Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date),
      total: 0,
      count: 0
    });
  }

  pedidos.forEach((pedido) => {
    if (!pedido.data || pedido.status === 'cancelado') return;
    const key = pedido.data.slice(0, 7);
    const bucket = months.find((month) => month.key === key);
    if (!bucket) return;
    bucket.total += Number(pedido.total || 0);
    bucket.count += 1;
  });

  return months;
}

function calculateQuarterDelta(pedidos: Pedido[]) {
  const valid = sortPedidosByDateDesc(pedidos).filter((pedido) => pedido.status !== 'cancelado');
  const now = new Date();
  const currentQuarter: Pedido[] = [];
  const previousQuarter: Pedido[] = [];

  valid.forEach((pedido) => {
    if (!pedido.data) return;
    const date = new Date(pedido.data);
    if (Number.isNaN(date.getTime())) return;
    const monthDiff = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    if (monthDiff >= 0 && monthDiff <= 2) currentQuarter.push(pedido);
    if (monthDiff >= 3 && monthDiff <= 5) previousQuarter.push(pedido);
  });

  const currentAvg =
    currentQuarter.length > 0
      ? currentQuarter.reduce((sum, pedido) => sum + Number(pedido.total || 0), 0) / currentQuarter.length
      : 0;
  const previousAvg =
    previousQuarter.length > 0
      ? previousQuarter.reduce((sum, pedido) => sum + Number(pedido.total || 0), 0) / previousQuarter.length
      : 0;

  if (!currentAvg || !previousAvg) {
    return null;
  }

  return ((currentAvg - previousAvg) / previousAvg) * 100;
}

function buildKpis(pedidosAbertos: Pedido[], pedidosFechados: Pedido[], contas: ContaReceber[]): KpiCard[] {
  const allPedidos = [...pedidosAbertos, ...pedidosFechados].filter((pedido) => pedido.status !== 'cancelado');
  const contasPendentes = contas.filter((conta) => getContaValorEmAberto(conta) > 0);
  const vencidas = contasPendentes.filter((conta) => getContaStatus(conta) === 'vencida');
  const saldoAberto = contasPendentes.reduce((sum, conta) => sum + getContaValorEmAberto(conta), 0);
  const pedidosAbertosTotal = pedidosAbertos.reduce((sum, pedido) => sum + Number(pedido.total || 0), 0);
  const totalHistorico = allPedidos.reduce((sum, pedido) => sum + Number(pedido.total || 0), 0);
  const ticketMedio = allPedidos.length ? totalHistorico / allPedidos.length : 0;
  const delta = calculateQuarterDelta(allPedidos);
  const earliestPedido = allPedidos
    .map((pedido) => pedido.data)
    .filter(Boolean)
    .sort()[0];
  const monthsAsClient = earliestPedido
    ? Math.max(
        1,
        (new Date().getFullYear() - new Date(earliestPedido).getFullYear()) * 12 +
          (new Date().getMonth() - new Date(earliestPedido).getMonth()) +
          1
      )
    : 0;

  return [
    {
      label: 'Saldo a receber',
      value: formatCurrency(saldoAberto),
      subtitle: `${vencidas.length} vencida(s)`,
      tone: vencidas.length ? 'negative' : 'neutral'
    },
    {
      label: 'Pedidos abertos',
      value: String(pedidosAbertos.length),
      subtitle: `${formatCurrency(pedidosAbertosTotal)} em aberto`
    },
    {
      label: 'Ticket médio',
      value: formatCurrency(ticketMedio),
      subtitle:
        delta == null
          ? 'Sem base comparativa'
          : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs trimestre`,
      tone: delta == null ? 'neutral' : delta >= 0 ? 'positive' : 'negative'
    },
    {
      label: 'LTV total',
      value: formatCurrency(totalHistorico),
      subtitle:
        allPedidos.length > 0
          ? `${allPedidos.length} pedido(s) · ${monthsAsClient} mês(es) com histórico`
          : 'Sem histórico de pedidos'
    }
  ];
}

function getRfmLabel(rfm?: { r: number; f: number; m: number }) {
  if (!rfm) return { label: 'Sem análise', tone: 'slate' as const };
  const score = (rfm.r + rfm.f + rfm.m) / 3;
  if (score >= 4) return { label: 'Campeão', tone: 'green' as const };
  if (score >= 3) return { label: 'Fiel', tone: 'green' as const };
  if (score >= 2) return { label: 'Potencial', tone: 'slate' as const };
  return { label: 'Risco de Churn', tone: 'red' as const };
}

function renderMetadataLine(cliente: Cliente, pedidos: Pedido[]) {
  const firstPedidoDate = sortPedidosByDateDesc(pedidos)
    .map((pedido) => pedido.data)
    .filter(Boolean)
    .sort()[0];

  return [
    firstPedidoDate ? `1º pedido em ${formatMonthYear(firstPedidoDate)}` : 'Sem histórico de pedidos',
    `Vendedor: ${cliente.rca_nome || 'Sem vendedor'}`,
    `Tabela ${cliente.tab || 'padrão'}`,
    `Prazo ${formatPrazoLabel(cliente.prazo)}`
  ].join(' · ');
}

function ClienteInfoTable({
  rows
}: {
  rows: Array<{ label: string; value: string | null | undefined; muted?: boolean }>;
}) {
  return (
    <div className="flex flex-col">
      {rows.map((row, i) => (
        <div key={row.label} className={`flex items-center justify-between py-3${i !== rows.length - 1 ? 'border-b border-white/5' : ''}`}>
          <span className="text-sm font-medium text-slate-400">{row.label}</span>
          <span className={`text-sm font-semibold text-right${row.value ? 'text-slate-100' : 'text-slate-500 italic'}`}>
            {row.value || 'Não informado'}
          </span>
        </div>
      ))}
    </div>
  );
}

function SimpleBarsChart({ pedidos }: { pedidos: Pedido[] }) {
  const series = useMemo(() => buildPurchaseSeries(pedidos), [pedidos]);
  const total = series.reduce((sum, month) => sum + month.total, 0);
  const count = series.reduce((sum, month) => sum + month.count, 0);

  return (
    <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Histórico de compras</h3>
          <p className="text-sm font-medium text-slate-400 mt-1">
            {formatCurrency(total)} · {count} pedido(s)
          </p>
        </div>
        <span className="px-2 py-1 text-[10px] font-bold tracking-widest text-slate-400 bg-slate-800 rounded-md">12 MESES</span>
      </div>

      {count === 0 ? (
        <EmptyState
          title="Sem histórico recente"
          description="Ainda não há pedidos suficientes para montar a leitura dos últimos 12 meses."
          compact
        />
      ) : (
        <div className="w-full mt-2">
          <SystemBarChart
            data={series}
            xKey="label"
            series={[{ key: 'total', label: 'Compras', color: '#3b82f6' }]}
            height={160}
            hideYAxis
            ariaLabel="Histórico de compras dos últimos 12 meses"
            valueFormatter={(value) => formatCurrency(Number(value || 0))}
          />
        </div>
      )}
    </section>
  );
}

function PedidosTable({
  pedidos,
  emptyTitle,
  onOpenPedido
}: {
  pedidos: Pedido[];
  emptyTitle: string;
  onOpenPedido: (pedidoId: string) => void;
}) {
  if (!pedidos.length) {
    return <EmptyState title={emptyTitle} compact />;
  }

  const PILL_COLORS: Record<string, string> = {
    warning: 'bg-amber-500/10 text-amber-400',
    info: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
    danger: 'bg-rose-500/10 text-rose-400',
    success: 'bg-emerald-500/10 text-emerald-400',
    neutral: 'bg-slate-500/10 text-slate-400'
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse whitespace-nowrap">
        <thead>
          <tr>
            <th className="px-4 py-3 text-xs font-semibold text-slate-400 border-b border-white/5">Pedido</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-400 border-b border-white/5">Descrição</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-400 border-b border-white/5">Valor</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-400 border-b border-white/5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {pedidos.map((pedido) => (
            <tr key={pedido.id} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-3">
                <button className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors" type="button" onClick={() => onOpenPedido(pedido.id)}>
                  #{pedido.num}
                </button>
              </td>
              <td className="px-4 py-3 text-sm text-slate-400">{pedido.tipo === 'atacado' ? 'Atacado' : 'Pedido comercial'}</td>
              <td className="px-4 py-3 text-sm font-semibold text-white">{formatCurrency(Number(pedido.total || 0))}</td>
              <td className="px-4 py-3">
                <span className={`px-2.5 py-1 text-xs font-bold rounded-md${PILL_COLORS[getPedidoStatusPill(pedido.status)] || PILL_COLORS.neutral}`}>
                  {pedido.status || 'Em andamento'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FinanceiroTable({
  contas,
  emptyTitle,
  onOpenConta
}: {
  contas: ContaReceber[];
  emptyTitle: string;
  onOpenConta: (contaId: string) => void;
}) {
  if (!contas.length) {
    return <EmptyState title={emptyTitle} compact />;
  }

  const STATUS_COLORS: Record<string, string> = {
    vencida: 'bg-rose-500/10 text-rose-400',
    a_vencer: 'bg-amber-500/10 text-amber-400',
    recebida: 'bg-emerald-500/10 text-emerald-400'
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse whitespace-nowrap">
        <thead>
          <tr>
            <th className="px-4 py-3 text-xs font-semibold text-slate-400 border-b border-white/5">Data</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-400 border-b border-white/5">Descrição</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-400 border-b border-white/5">Valor</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-400 border-b border-white/5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {contas.map((conta) => {
            const status = getContaStatus(conta);
            return (
              <tr key={conta.id} className="hover:bg-white/5 transition-colors">
                <td className={`px-4 py-3 text-sm font-medium${status === 'vencida' ? 'text-rose-400' : 'text-slate-400'}`}>
                  {formatCompactDate(conta.vencimento)}
                </td>
                <td className="px-4 py-3">
                  <button className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors" type="button" onClick={() => onOpenConta(conta.id)}>
                    {conta.pedido_num ? `Pedido #${conta.pedido_num}` : 'Conta avulsa'}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-white">{formatCurrency(getContaValorEmAberto(conta))}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-md${STATUS_COLORS[status]}`}>
                    {status === 'vencida' ? 'Vencida' : status === 'a_vencer' ? 'A vencer' : 'Recebida'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ClienteProfilePage({
  cliente,
  loadingCliente = false,
  onClienteSaved,
  onReload
}: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingCadastro, setEditingCadastro] = useState(false);
  const [notaDraft, setNotaDraft] = useState('');
  const [notaError, setNotaError] = useState<string | null>(null);

  const activeTab = normalizeTab(searchParams.get('tab'));
  const { pedidosAbertos, pedidosFechados, loading: pedidosLoading, error: pedidosError } =
    useClientePedidos({ cliente, skip: !cliente.id });
  const {
    contas,
    loading: contasLoading,
    error: contasError
  } = useClienteReceber({ cliente, skip: !cliente.id });
  const {
    notas,
    loading: notasLoading,
    saving: notaSaving,
    error: notasError,
    submitNota
  } = useClienteNotes({ clienteId: cliente.id, skip: !cliente.id });

  const allPedidos = useMemo(
    () => sortPedidosByDateDesc([...pedidosAbertos, ...pedidosFechados]),
    [pedidosAbertos, pedidosFechados]
  );
  const contasPendentes = useMemo(
    () => contas.filter((conta) => getContaValorEmAberto(conta) > 0),
    [contas]
  );
  const notasOrdenadas = useMemo(
    () =>
      [...notas].sort((a, b) => {
        const aDate = new Date(a.data || '').getTime() || 0;
        const bDate = new Date(b.data || '').getTime() || 0;
        return bDate - aDate;
      }),
    [notas]
  );
  const ultimaNota = notasOrdenadas[0] ?? null;
  const kpis = useMemo(() => buildKpis(pedidosAbertos, pedidosFechados, contas), [contas, pedidosAbertos, pedidosFechados]);
  const whatsappLink = getWhatsappLink(cliente);

  useEffect(() => {
    setEditingCadastro(false);
  }, [cliente.id]);

  function setTab(tab: ClienteProfileTab) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (tab === 'resumo') next.delete('tab');
      else next.set('tab', tab);
      return next;
    });
  }

  async function handleSubmitNota() {
    const texto = notaDraft.trim();
    if (!texto) {
      setNotaError('Digite uma nota antes de salvar.');
      return;
    }
    try {
      setNotaError(null);
      await submitNota(texto);
      setNotaDraft('');
    } catch (err) {
      setNotaError(err instanceof Error ? err.message : 'Erro ao salvar nota.');
    }
  }

  if (loadingCliente) {
    return (
      <main className="max-w-7xl mx-auto flex flex-col gap-6 w-full px-4 sm:px-6 lg:px-8 py-8">
        <LoadingState
          title="Carregando cliente…"
          description="Estamos reunindo cadastro, pedidos, financeiro e notas para abrir a visão completa."
        />
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto flex flex-col gap-6 w-full px-4 sm:px-6 lg:px-8 py-8" data-testid="cliente-profile-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <button 
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors" 
            type="button" 
            onClick={() => navigate('/app/clientes')}
          >
            <ChevronLeft className="w-4 h-4" />
            Clientes
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-white font-semibold">{cliente.nome}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary"
            className="gap-2"
            onClick={() => {}}
            leftIcon={<Share2 className="w-4 h-4" />}
          >
            Exportar
          </Button>
          <Button 
            variant="secondary"
            size="sm"
            className="!p-2 rounded-xl"
            onClick={() => {}}
            leftIcon={<MoreHorizontal className="w-4 h-4" />}
          />
        </div>
      </div>

      <section className="bg-slate-900 border border-white/5 rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-2xl font-bold text-white shadow-inner">
            {getInitials(cliente.nome)}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white tracking-tight">{cliente.nome}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold${cliente.status === 'ativo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                {cliente.status === 'inativo' ? 'Inativo' : 'Ativo'}
              </span>
              {cliente.optin_marketing ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400">MKT</span>
              ) : null}
            </div>
            <p className="text-sm font-medium text-slate-400">{renderMetadataLine(cliente, allPedidos)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            className="gap-2"
            disabled={!whatsappLink}
            onClick={() => {
              if (whatsappLink) window.open(whatsappLink, '_blank', 'noopener,noreferrer');
            }}
            leftIcon={<MessageSquare className="w-4 h-4 text-emerald-500" />}
          >
            Mensagem
          </Button>
          <Button 
            variant="primary" 
            className="gap-2"
            onClick={() => navigate(buildPedidosRoute({ view: 'new', clienteId: cliente.id }))}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Novo pedido
          </Button>
          <ActionMenu
            label="Mais ações"
            items={[
              {
                key: 'editar-cadastro',
                label: 'Editar cadastro',
                onClick: () => {
                  setTab('cadastro');
                  setEditingCadastro(true);
                }
              },
              {
                key: 'abrir-financeiro',
                label: 'Abrir financeiro',
                onClick: () => navigate(buildClienteRoute(cliente.id, { tab: 'financeiro' }))
              }
            ]}
          />
        </div>
      </section>

      <section className="rf-kpi-grid">
        {kpis.map((card, idx) => {
          let Icon = TrendingUp;
          if (card.label.includes('Saldo')) Icon = DollarSign;
          if (card.label.includes('Pedidos')) Icon = Package;
          if (card.label.includes('Ticket')) Icon = Zap;
          if (card.label.includes('LTV')) Icon = Database;

          const toneClass = 
            card.tone === 'positive' ? 'is-success' : 
            card.tone === 'negative' ? 'is-danger' : 
            '';

          return (
            <motion.article 
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`rf-dash-card${toneClass}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="rf-stat-label !mb-0">{card.label}</span>
                <div className={`p-2 rounded-lg bg-white/5 border border-white/10 shadow-sm${card.tone === 'positive' ? 'text-emerald-400' : card.tone === 'negative' ? 'text-rose-400' : 'text-slate-500'}`}>
                  <Icon size={14} strokeWidth={2.5} />
                </div>
              </div>

              <div className="rf-stat-value">
                {card.value.includes('R$') ? (
                  <CountUp 
                    end={parseFloat(card.value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0} 
                    decimals={2} 
                    decimal="," 
                    prefix="R$ " 
                    duration={2} 
                    separator="."
                  />
                ) : (
                  <CountUp 
                    end={parseFloat(card.value) || 0} 
                    duration={2} 
                    separator="."
                  />
                )}
              </div>

              <span className={`rf-stat-sub${card.tone === 'positive' ? 'success' : card.tone === 'negative' ? 'danger' : 'muted'}font-bold`}>
                {card.subtitle}
              </span>
            </motion.article>
          );
        })}
      </section>

      <nav className="rf-tabs-premium">
        {PROFILE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`rf-tab-item${activeTab === tab.id ? 'is-active' : ''}`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
              />
            )}
          </button>
        ))}
      </nav>

      {activeTab === 'resumo' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Pedidos em aberto</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-blue-400 hover:text-blue-300" 
                  onClick={() => setTab('pedidos')}
                  rightIcon={<ArrowUpRight className="w-4 h-4" />}
                >
                  Ver todos
                </Button>
              </div>
              {pedidosLoading ? (
                <LoadingState title="Carregando pedidos…" compact />
              ) : pedidosError ? (
                <ErrorState title={pedidosError} compact />
              ) : (
                <PedidosTable
                  pedidos={pedidosAbertos.slice(0, 5)}
                  emptyTitle="Nenhum pedido aberto para este cliente."
                  onOpenPedido={(pedidoId) => navigate(buildPedidosRoute({ pedidoId, view: 'detail' }))}
                />
              )}
            </section>

            <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white tracking-tight">Contas a receber</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {contasPendentes.length} pendente(s) ·{' '}
                  {contasPendentes.filter((conta) => getContaStatus(conta) === 'vencida').length} vencida(s)
                </p>
              </div>
              {contasLoading ? (
                <LoadingState title="Carregando contas…" compact />
              ) : contasError ? (
                <ErrorState title={contasError} compact />
              ) : (
                <FinanceiroTable
                  contas={contasPendentes.slice(0, 6)}
                  emptyTitle="Nenhuma conta pendente para este cliente."
                  onOpenConta={(contaId) => navigate(buildReceberRoute({ contaId }))}
                />
              )}
            </section>

            <SimpleBarsChart pedidos={allPedidos} />
          </div>

          <aside className="flex flex-col gap-6">
            <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white tracking-tight">Contato</h3>
              </div>
              <ClienteInfoTable
                rows={[
                  { label: 'WhatsApp', value: cliente.whatsapp || cliente.tel },
                  { label: 'E-mail', value: cliente.email },
                  { label: 'Cidade', value: cliente.cidade },
                  { label: 'Canal', value: cliente.optin_marketing ? 'Marketing ativo' : null }
                ]}
              />
            </section>

            <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white tracking-tight">Comercial</h3>
              </div>
              <ClienteInfoTable
                rows={[
                  { label: 'Segmento', value: cliente.seg },
                  { label: 'Tabela', value: cliente.tab || 'Padrão' },
                  { label: 'Prazo', value: formatPrazoLabel(cliente.prazo) },
                  { label: 'Vendedor', value: cliente.rca_nome }
                ]}
              />
            </section>

            <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap size={60} strokeWidth={3} className="text-blue-500" />
              </div>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  Nexus Intelligence
                  <Badge variant="indigo" className="!text-[8px]">IA</Badge>
                </h3>
              </div>
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-sm font-medium text-slate-400">Score RFM</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-bold text-white">{getRfmLabel(cliente.score_rfm).label}</span>
                    <Badge variant={getRfmLabel(cliente.score_rfm).tone}>
                      {((cliente.score_rfm?.r || 0) + (cliente.score_rfm?.f || 0) + (cliente.score_rfm?.m || 0)).toFixed(1)}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <span className="text-sm font-medium text-slate-400">Probabilidade de Compra</span>
                  <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '75%' }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-blue-500" 
                    />
                  </div>
                  <span className="text-[10px] font-bold text-blue-400 mt-1 block text-right">Alta (75%)</span>
                </div>
              </div>
            </section>

            <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white tracking-tight">Última nota</h3>
              </div>
              {notasLoading ? (
                <LoadingState title="Carregando nota…" compact />
              ) : notasError ? (
                <ErrorState title={notasError} compact />
              ) : ultimaNota ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <div className="mb-2 text-sm font-medium text-slate-400">
                    {formatDateLong(ultimaNota.data)}
                  </div>
                  <p className="text-sm font-medium text-amber-200/80 leading-relaxed">{ultimaNota.texto}</p>
                </div>
              ) : (
                <EmptyState title="Nenhuma nota registrada." compact />
              )}
            </section>
          </aside>
        </div>
      ) : null}

      {activeTab === 'marketing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="rf-card-premium p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              Atribuição e Origem
            </h3>
            <ClienteInfoTable
              rows={[
                { label: 'Origem (Source)', value: cliente.utm_source },
                { label: 'Mídia (Medium)', value: cliente.utm_medium },
                { label: 'Campanha', value: cliente.utm_campaign },
                { label: 'Termo/Keyword', value: cliente.utm_term },
                { label: 'Conteúdo Ads', value: cliente.utm_content },
                { label: 'Primeira Compra', value: formatDateLong(cliente.data_primeira_compra) }
              ]}
            />
          </section>

          <section className="rf-card-premium p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Comportamento (RFM)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center p-4 bg-white/5 rounded-xl border border-white/5">
                <span className="text-sm font-medium text-slate-400">Recência</span>
                <span className="text-2xl font-black text-white mt-2">{cliente.score_rfm?.r || 0}</span>
                <span className="text-[10px] text-slate-500 mt-1">/ 5</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-white/5 rounded-xl border border-white/5">
                <span className="text-sm font-medium text-slate-400">Frequência</span>
                <span className="text-2xl font-black text-white mt-2">{cliente.score_rfm?.f || 0}</span>
                <span className="text-[10px] text-slate-500 mt-1">/ 5</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-white/5 rounded-xl border border-white/5">
                <span className="text-sm font-medium text-slate-400">Monetário</span>
                <span className="text-2xl font-black text-white mt-2">{cliente.score_rfm?.m || 0}</span>
                <span className="text-[10px] text-slate-500 mt-1">/ 5</span>
              </div>
            </div>
            <div className="mt-6 p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/10">
              <p className="text-xs text-indigo-400 font-medium leading-relaxed">
                Este cliente tem um alto valor monetário e recência média. Recomendamos uma campanha de reativação focada em itens de alto ticket para maximizar o LTV.
              </p>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'pedidos' ? (
        <section className="flex flex-col gap-6">
          {pedidosLoading ? (
            <LoadingState title="Carregando pedidos…" />
          ) : pedidosError ? (
            <ErrorState title={pedidosError} />
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              <section className="flex-1 bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white tracking-tight">Pedidos em aberto</h3>
                </div>
                <PedidosTable
                  pedidos={pedidosAbertos}
                  emptyTitle="Nenhum pedido em aberto para este cliente."
                  onOpenPedido={(pedidoId) => navigate(buildPedidosRoute({ pedidoId, view: 'detail' }))}
                />
              </section>
              <section className="flex-1 bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white tracking-tight">Histórico de pedidos</h3>
                </div>
                <PedidosTable
                  pedidos={pedidosFechados}
                  emptyTitle="Nenhum pedido fechado para este cliente."
                  onOpenPedido={(pedidoId) => navigate(buildPedidosRoute({ pedidoId, view: 'detail' }))}
                />
              </section>
            </div>
          )}
        </section>
      ) : null}

      {activeTab === 'financeiro' ? (
        <section className="flex flex-col gap-6">
          {contasLoading ? (
            <LoadingState title="Carregando financeiro…" />
          ) : contasError ? (
            <ErrorState title={contasError} />
          ) : (
            <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white tracking-tight">Contas a receber</h3>
              </div>
              <FinanceiroTable
                contas={contas}
                emptyTitle="Nenhum título encontrado para este cliente."
                onOpenConta={(contaId) => navigate(buildReceberRoute({ contaId }))}
              />
            </section>
          )}
        </section>
      ) : null}

      {activeTab === 'notas' ? (
        <section className="flex flex-col gap-6">
          <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white tracking-tight">Notas comerciais</h3>
            </div>
            <div className="flex flex-col gap-3 mb-8">
              <textarea
                className="w-full bg-slate-950 border border-white/10 text-white text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 p-4 outline-none resize-y transition-all"
                rows={4}
                placeholder="Registrar observação comercial…"
                value={notaDraft}
                onChange={(event) => setNotaDraft(event.target.value)}
              />
              <FormError message={notaError || notasError} />
              <div className="flex justify-end mt-1">
                <Button 
                  variant="primary" 
                  loading={notaSaving} 
                  onClick={() => void handleSubmitNota()}
                  leftIcon={<PlusCircle className="w-4 h-4" />}
                >
                  Salvar nota
                </Button>
              </div>
            </div>
            {notasLoading ? (
              <LoadingState title="Carregando notas…" compact />
            ) : notasOrdenadas.length ? (
              <div className="flex flex-col gap-4">
                {notasOrdenadas.map((nota, index) => (
                  <article key={`${nota.data}-${index}`} className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <div className="mb-2 text-sm font-medium text-slate-400">{formatDateLong(nota.data)}</div>
                    <p className="text-sm font-medium text-amber-200/80 leading-relaxed">{nota.texto}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="Nenhuma nota registrada." compact />
            )}
          </section>
        </section>
      ) : null}

      {activeTab === 'cadastro' ? (
        <section className="flex flex-col gap-6">
          {editingCadastro ? (
            <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
              <ClienteForm
                initialCliente={cliente}
                analyticsOrigin="cliente_profile_page"
                onSaved={(savedCliente) => {
                  setEditingCadastro(false);
                  onClienteSaved?.(savedCliente);
                  onReload?.();
                }}
                onCancel={() => setEditingCadastro(false)}
              />
            </section>
          ) : (
            <section className="rf-cliente-profile__card">
              <div className="rf-cliente-profile__card-head">
                <div>
                  <h3 className="rf-cliente-profile__card-title">Cadastro</h3>
                  <p className="rf-cliente-profile__card-subtitle">
                    Revise os dados principais sem sair da página do cliente.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setEditingCadastro(true)}>
                  Editar cadastro
                </Button>
              </div>
              <div className="rf-cliente-profile__cadastro-grid">
                <ClienteInfoTable
                  rows={[
                    { label: 'Nome', value: cliente.nome },
                    { label: 'Apelido', value: cliente.apelido },
                    { label: 'Documento', value: cliente.doc },
                    { label: 'Tipo', value: cliente.tipo },
                    { label: 'Status', value: cliente.status },
                    { label: 'Aniversário', value: cliente.data_aniversario }
                  ]}
                />
                <ClienteInfoTable
                  rows={[
                    { label: 'Telefone', value: cliente.tel },
                    { label: 'WhatsApp', value: cliente.whatsapp },
                    { label: 'E-mail', value: cliente.email },
                    { label: 'Responsável', value: cliente.resp },
                    { label: 'Cidade', value: cliente.cidade },
                    { label: 'Estado', value: cliente.estado }
                  ]}
                />
              </div>
            </section>
          )}
        </section>
      ) : null}
    </main>
  );
}
