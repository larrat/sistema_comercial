import { useMemo } from 'react';
import type { Cliente, ContaReceber, Pedido } from '../../../../types/domain';
import { EmptyState } from '../../../shared/ui';
import { SystemBarChart } from '../../../app/components/charts';

export type ClienteProfileTab = 'resumo' | 'pedidos' | 'financeiro' | 'notas' | 'marketing' | 'cadastro';

export const PROFILE_TABS: Array<{ id: ClienteProfileTab; label: string }> = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'notas', label: 'Notas' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'cadastro', label: 'Cadastro' }
];

export function normalizeTab(value: string | null): ClienteProfileTab {
  return PROFILE_TABS.some((tab) => tab.id === value) ? (value as ClienteProfileTab) : 'resumo';
}

export function formatCurrency(value: number): string {
  return Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

export function formatCompactDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short'
  }).format(date);
}

export function formatMonthYear(value?: string | null): string {
  if (!value) return 'Sem histórico';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function formatDateLong(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function formatPrazoLabel(value?: string | null): string {
  if (!value) return 'À vista';
  if (value === 'a_vista' || value === 'imediato') return 'À vista';
  if (value.endsWith('d')) return `${value.replace('d', '')}d`;
  return value;
}

export function getInitials(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function getWhatsappLink(cliente: Cliente): string | null {
  const raw = cliente.whatsapp || cliente.tel || '';
  const digits = raw.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

export function getPedidoStatusPill(status?: string | null): string {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'separacao' || normalized === 'separação') return 'warning';
  if (normalized === 'rota') return 'info';
  if (normalized.includes('aguarda')) return 'purple';
  if (normalized === 'cancelado') return 'danger';
  if (normalized === 'entregue') return 'success';
  return 'neutral';
}

export function getContaStatus(conta: ContaReceber): 'vencida' | 'a_vencer' | 'recebida' {
  const aberto = getContaValorEmAberto(conta);
  if (aberto <= 0) return 'recebida';
  const hoje = new Date().toISOString().slice(0, 10);
  return conta.vencimento < hoje ? 'vencida' : 'a_vencer';
}

export function getContaValorEmAberto(conta: ContaReceber): number {
  if (typeof conta.valor_em_aberto === 'number') return Number(conta.valor_em_aberto || 0);
  const valor = Number(conta.valor || 0);
  const recebido = Number(conta.valor_recebido || 0);
  return Math.max(0, valor - recebido);
}

export function sortPedidosByDateDesc(items: Pedido[]): Pedido[] {
  return [...items].sort((a, b) => {
    const aDate = new Date(a.data || '').getTime() || 0;
    const bDate = new Date(b.data || '').getTime() || 0;
    return bDate - aDate || Number(b.num || 0) - Number(a.num || 0);
  });
}

export function buildPurchaseSeries(pedidos: Pedido[]) {
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

export function calculateQuarterDelta(pedidos: Pedido[]) {
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

export type KpiCard = {
  label: string;
  value: string;
  subtitle: string;
  tone?: 'positive' | 'negative' | 'neutral';
};

export function buildKpis(pedidosAbertos: Pedido[], pedidosFechados: Pedido[], contas: ContaReceber[]): KpiCard[] {
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

export function getRfmLabel(rfm?: { r: number; f: number; m: number }) {
  if (!rfm) return { label: 'Sem análise', tone: 'slate' as const };
  const score = (rfm.r + rfm.f + rfm.m) / 3;
  if (score >= 4) return { label: 'Campeão', tone: 'green' as const };
  if (score >= 3) return { label: 'Fiel', tone: 'green' as const };
  if (score >= 2) return { label: 'Potencial', tone: 'slate' as const };
  return { label: 'Risco de Churn', tone: 'red' as const };
}

export function renderMetadataLine(cliente: Cliente, pedidos: Pedido[]) {
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

export function ClienteInfoTable({
  rows
}: {
  rows: Array<{ label: string; value: string | null | undefined; muted?: boolean }>;
}) {
  return (
    <div className="flex flex-col">
      {rows.map((row, i) => (
        <div key={row.label} className={`flex items-center justify-between py-3${i !== rows.length - 1 ? ' border-b border-white/5' : ''}`}>
          <span className="text-sm font-medium text-slate-400">{row.label}</span>
          <span className={`text-sm font-semibold text-right ${row.value ? 'text-slate-100' : 'text-slate-500 italic'}`}>
            {row.value || 'Não informado'}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SimpleBarsChart({ pedidos }: { pedidos: Pedido[] }) {
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

export function PedidosTable({
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
                <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${PILL_COLORS[getPedidoStatusPill(pedido.status)] || PILL_COLORS.neutral}`}>
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

export function FinanceiroTable({
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
                <td className={`px-4 py-3 text-sm font-medium ${status === 'vencida' ? 'text-rose-400' : 'text-slate-400'}`}>
                  {formatCompactDate(conta.vencimento)}
                </td>
                <td className="px-4 py-3">
                  <button className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors" type="button" onClick={() => onOpenConta(conta.id)}>
                    {conta.pedido_num ? `Pedido #${conta.pedido_num}` : 'Conta avulsa'}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-white">{formatCurrency(getContaValorEmAberto(conta))}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${STATUS_COLORS[status]}`}>
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
