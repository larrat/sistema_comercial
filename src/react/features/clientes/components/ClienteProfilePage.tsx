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
  LoadingState
} from '../../../shared/ui';
import { SystemBarChart } from '../../../app/components/charts';
import { ClienteForm } from './ClienteForm';
import { useClienteNotes } from '../hooks/useClienteNotes';
import { useClientePedidos } from '../hooks/useClientePedidos';
import { useClienteReceber } from '../hooks/useClienteReceber';

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
    <div className="rf-cliente-profile__info-table">
      {rows.map((row) => (
        <div key={row.label} className="rf-cliente-profile__info-row">
          <span className="rf-cliente-profile__info-label">{row.label}</span>
          <span className={row.value ? 'rf-cliente-profile__info-value' : 'rf-cliente-profile__info-value is-muted'}>
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
    <section className="rf-cliente-profile__card">
      <div className="rf-cliente-profile__card-head">
        <div>
          <h3 className="rf-cliente-profile__card-title">Histórico de compras</h3>
          <p className="rf-cliente-profile__card-subtitle">
            {formatCurrency(total)} · {count} pedido(s)
          </p>
        </div>
        <span className="rf-cliente-profile__pill is-neutral">12 MESES</span>
      </div>

      {count === 0 ? (
        <EmptyState
          title="Sem histórico recente"
          description="Ainda não há pedidos suficientes para montar a leitura dos últimos 12 meses."
          compact
        />
      ) : (
        <div className="rf-cliente-profile__chart">
          <SystemBarChart
            data={series}
            xKey="label"
            yKey="total"
            height={140}
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

  return (
    <div className="rf-cliente-profile__table-wrap">
      <table className="rf-cliente-profile__table">
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Descrição</th>
            <th>Valor</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <tr key={pedido.id}>
              <td>
                <button className="rf-cliente-profile__link-btn" type="button" onClick={() => onOpenPedido(pedido.id)}>
                  #{pedido.num}
                </button>
              </td>
              <td>{pedido.tipo === 'atacado' ? 'Atacado' : 'Pedido comercial'}</td>
              <td>{formatCurrency(Number(pedido.total || 0))}</td>
              <td>
                <span className={`rf-cliente-profile__pill is-${getPedidoStatusPill(pedido.status)}`}>
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

  return (
    <div className="rf-cliente-profile__table-wrap">
      <table className="rf-cliente-profile__table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th>Valor</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {contas.map((conta) => {
            const status = getContaStatus(conta);
            return (
              <tr key={conta.id}>
                <td className={status === 'vencida' ? 'is-danger' : ''}>{formatCompactDate(conta.vencimento)}</td>
                <td>
                  <button className="rf-cliente-profile__link-btn" type="button" onClick={() => onOpenConta(conta.id)}>
                    {conta.pedido_num ? `Pedido #${conta.pedido_num}` : 'Conta avulsa'}
                  </button>
                </td>
                <td>{formatCurrency(getContaValorEmAberto(conta))}</td>
                <td>
                  <span className={`rf-cliente-profile__pill is-${status === 'vencida' ? 'danger' : status === 'a_vencer' ? 'warning' : 'success'}`}>
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
      <main className="rf-content rf-ui-stack rf-cliente-profile">
        <LoadingState
          title="Carregando cliente..."
          description="Estamos reunindo cadastro, pedidos, financeiro e notas para abrir a visão completa."
        />
      </main>
    );
  }

  return (
    <main className="rf-content rf-ui-stack rf-cliente-profile" data-testid="cliente-profile-page">
      <div className="rf-cliente-profile__breadcrumb">
        <button className="rf-cliente-profile__back" type="button" onClick={() => navigate('/app/clientes')}>
          Voltar
        </button>
        <span>Clientes / {cliente.nome}</span>
      </div>

      <section className="rf-cliente-profile__hero">
        <div className="rf-cliente-profile__hero-main">
          <div className="rf-cliente-profile__avatar">{getInitials(cliente.nome)}</div>
          <div className="rf-cliente-profile__hero-copy">
            <div className="rf-cliente-profile__title-row">
              <h1>{cliente.nome}</h1>
              <span className={`rf-cliente-profile__pill is-${cliente.status === 'ativo' ? 'success' : 'neutral'}`}>
                {cliente.status === 'inativo' ? 'Inativo' : 'Ativo'}
              </span>
              {cliente.optin_marketing ? (
                <span className="rf-cliente-profile__pill is-purple">MKT</span>
              ) : null}
            </div>
            <p className="rf-cliente-profile__meta-line">{renderMetadataLine(cliente, allPedidos)}</p>
          </div>
        </div>

        <div className="rf-cliente-profile__hero-actions">
          <button
            className="btn btn-sm"
            type="button"
            disabled={!whatsappLink}
            onClick={() => {
              if (whatsappLink) window.open(whatsappLink, '_blank', 'noopener,noreferrer');
            }}
          >
            Mensagem
          </button>
          <button
            className="btn btn-p btn-sm"
            type="button"
            onClick={() => navigate(buildPedidosRoute({ view: 'new', clienteId: cliente.id }))}
          >
            Novo pedido
          </button>
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

      <section className="rf-cliente-profile__kpis">
        {kpis.map((card) => (
          <article key={card.label} className="rf-cliente-profile__kpi-card">
            <div className="rf-cliente-profile__kpi-label">{card.label}</div>
            <div className="rf-cliente-profile__kpi-value">{card.value}</div>
            <div className={`rf-cliente-profile__kpi-subtitle${card.tone ? ` is-${card.tone}` : ''}`}>{card.subtitle}</div>
          </article>
        ))}
      </section>

      <div className="rf-cliente-profile__tabs">
        {PROFILE_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`rf-cliente-profile__tab${activeTab === tab.id ? ' is-active' : ''}`}
            type="button"
            onClick={() => setTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'resumo' ? (
        <section className="rf-cliente-profile__summary-grid">
          <div className="rf-cliente-profile__summary-main">
            <section className="rf-cliente-profile__card">
              <div className="rf-cliente-profile__card-head">
                <div>
                  <h3 className="rf-cliente-profile__card-title">Pedidos em aberto</h3>
                </div>
                <button className="rf-cliente-profile__link-btn" type="button" onClick={() => setTab('pedidos')}>
                  Ver todos
                </button>
              </div>
              {pedidosLoading ? (
                <LoadingState title="Carregando pedidos..." compact />
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

            <section className="rf-cliente-profile__card">
              <div className="rf-cliente-profile__card-head">
                <div>
                  <h3 className="rf-cliente-profile__card-title">Contas a receber</h3>
                  <p className="rf-cliente-profile__card-subtitle">
                    {contasPendentes.length} pendente(s) ·{' '}
                    {contasPendentes.filter((conta) => getContaStatus(conta) === 'vencida').length} vencida(s)
                  </p>
                </div>
              </div>
              {contasLoading ? (
                <LoadingState title="Carregando contas..." compact />
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

          <aside className="rf-cliente-profile__summary-side">
            <section className="rf-cliente-profile__card">
              <div className="rf-cliente-profile__card-head">
                <h3 className="rf-cliente-profile__card-title">Contato</h3>
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

            <section className="rf-cliente-profile__card">
              <div className="rf-cliente-profile__card-head">
                <h3 className="rf-cliente-profile__card-title">Comercial</h3>
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

            <section className="rf-cliente-profile__card">
              <div className="rf-cliente-profile__card-head">
                <h3 className="rf-cliente-profile__card-title">Última nota</h3>
              </div>
              {notasLoading ? (
                <LoadingState title="Carregando nota..." compact />
              ) : notasError ? (
                <ErrorState title={notasError} compact />
              ) : ultimaNota ? (
                <div className="rf-cliente-profile__note-card">
                  <div className="rf-cliente-profile__note-meta">
                    {formatDateLong(ultimaNota.data)} · autoria não disponível na origem atual
                  </div>
                  <p>{ultimaNota.texto}</p>
                </div>
              ) : (
                <EmptyState title="Nenhuma nota registrada." compact />
              )}
            </section>
          </aside>
        </section>
      ) : null}

      {activeTab === 'pedidos' ? (
        <section className="rf-cliente-profile__tab-panel">
          {pedidosLoading ? (
            <LoadingState title="Carregando pedidos..." />
          ) : pedidosError ? (
            <ErrorState title={pedidosError} />
          ) : (
            <div className="rf-cliente-profile__tab-stack">
              <section className="rf-cliente-profile__card">
                <div className="rf-cliente-profile__card-head">
                  <h3 className="rf-cliente-profile__card-title">Pedidos em aberto</h3>
                </div>
                <PedidosTable
                  pedidos={pedidosAbertos}
                  emptyTitle="Nenhum pedido em aberto para este cliente."
                  onOpenPedido={(pedidoId) => navigate(buildPedidosRoute({ pedidoId, view: 'detail' }))}
                />
              </section>
              <section className="rf-cliente-profile__card">
                <div className="rf-cliente-profile__card-head">
                  <h3 className="rf-cliente-profile__card-title">Histórico de pedidos</h3>
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
        <section className="rf-cliente-profile__tab-panel">
          {contasLoading ? (
            <LoadingState title="Carregando financeiro..." />
          ) : contasError ? (
            <ErrorState title={contasError} />
          ) : (
            <section className="rf-cliente-profile__card">
              <div className="rf-cliente-profile__card-head">
                <h3 className="rf-cliente-profile__card-title">Contas a receber</h3>
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
        <section className="rf-cliente-profile__tab-panel">
          <section className="rf-cliente-profile__card">
            <div className="rf-cliente-profile__card-head">
              <h3 className="rf-cliente-profile__card-title">Notas comerciais</h3>
            </div>
            <div className="rf-cliente-profile__notes-compose">
              <textarea
                className="inp"
                rows={4}
                placeholder="Registrar observação comercial"
                value={notaDraft}
                onChange={(event) => setNotaDraft(event.target.value)}
              />
              <FormError message={notaError || notasError} />
              <div className="rf-cliente-profile__notes-actions">
                <button className="btn btn-sm" type="button" disabled={notaSaving} onClick={() => void handleSubmitNota()}>
                  {notaSaving ? 'Salvando…' : 'Salvar nota'}
                </button>
              </div>
            </div>
            {notasLoading ? (
              <LoadingState title="Carregando notas..." compact />
            ) : notasOrdenadas.length ? (
              <div className="rf-cliente-profile__notes-list">
                {notasOrdenadas.map((nota, index) => (
                  <article key={`${nota.data}-${index}`} className="rf-cliente-profile__note-row">
                    <div className="rf-cliente-profile__note-meta">{formatDateLong(nota.data)}</div>
                    <p>{nota.texto}</p>
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
        <section className="rf-cliente-profile__tab-panel">
          {editingCadastro ? (
            <section className="rf-cliente-profile__card">
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
                <button className="btn btn-sm" type="button" onClick={() => setEditingCadastro(true)}>
                  Editar cadastro
                </button>
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
