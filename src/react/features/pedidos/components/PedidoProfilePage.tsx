import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { ContaReceber, ContaReceberBaixa, Pedido, PedidoItem } from '../../../../types/domain';
import { EmptyState, ErrorState, LoadingState, StatusBadge } from '../../../shared/ui';
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
import { PedidoItemsSection } from './PedidoItemsSection';

type PedidoProfileTab = 'itens' | 'pagamento' | 'logistica' | 'historico' | 'cadastro';

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
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'logistica', label: 'Entrega/Logística' },
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
    <div className="rf-cliente-profile__info-table">
      {rows.map((row) => (
        <div key={row.label} className="rf-cliente-profile__info-row">
          <span className="rf-cliente-profile__info-label">{row.label}</span>
          <span
            className={
              row.value
                ? 'rf-cliente-profile__info-value'
                : 'rf-cliente-profile__info-value is-muted'
            }
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
    <div className="rf-cliente-profile__table-wrap">
      <table className="rf-cliente-profile__table">
        <thead>
          <tr>
            <th>Valor</th>
            <th>Recebido em</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>
          {baixas.map((baixa) => (
            <tr key={baixa.id}>
              <td>{formatCurrency(baixa.valor)}</td>
              <td>{formatDateTime(baixa.recebido_em)}</td>
              <td>{baixa.observacao || '—'}</td>
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
      <main className="rf-content rf-ui-stack rf-cliente-profile rf-pedido-profile">
        <LoadingState
          title="Carregando pedido..."
          description="Estamos reunindo itens, pagamento, logística e cadastro do pedido."
        />
      </main>
    );
  }

  return (
    <main
      className="rf-content rf-ui-stack rf-cliente-profile rf-pedido-profile"
      data-testid="pedido-profile-page"
    >
      <div className="rf-cliente-profile__breadcrumb">
        <button
          className="rf-cliente-profile__back"
          type="button"
          onClick={() => navigate('/app/pedidos')}
        >
          Voltar
        </button>
        <span>Pedidos / #{pedido.num}</span>
      </div>

      {error ? <ErrorState title={error} compact onRetry={onReload} /> : null}

      <section className="rf-cliente-profile__hero">
        <div className="rf-cliente-profile__hero-main">
          <div className="rf-cliente-profile__avatar">{getInitials(pedido.cli)}</div>
          <div className="rf-cliente-profile__hero-copy">
            <div className="rf-cliente-profile__title-row">
              <h1>Pedido #{pedido.num}</h1>
              <span className={`rf-cliente-profile__pill is-${statusTone}`}>
                {PEDIDO_STATUS_LABEL[status] || status || '—'}
              </span>
              {pedido.tipo ? (
                <span className="rf-cliente-profile__pill is-info">
                  {pedido.tipo === 'atacado' ? 'Atacado' : 'Varejo'}
                </span>
              ) : null}
            </div>
            <p className="rf-cliente-profile__meta-line">
              {pedido.cli || 'Cliente não informado'} · {formatDate(pedido.data)} ·{' '}
              {pedido.rca_nome || 'Sem vendedor'}
            </p>
          </div>
        </div>

        <div className="rf-cliente-profile__hero-actions">
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

      <section className="rf-cliente-profile__kpis">
        {kpis.map((card) => (
          <article key={card.label} className="rf-cliente-profile__kpi-card">
            <div className="rf-cliente-profile__kpi-label">{card.label}</div>
            <div className="rf-cliente-profile__kpi-value">{card.value}</div>
            <div
              className={`rf-cliente-profile__kpi-subtitle${card.tone ? ` is-${card.tone}` : ''}`}
            >
              {card.subtitle}
            </div>
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

      {activeTab === 'itens' ? (
        <section className="rf-cliente-profile__tab-panel">
          <section className="rf-cliente-profile__card">
            <div className="rf-cliente-profile__card-head">
              <div>
                <h3 className="rf-cliente-profile__card-title">Itens do pedido</h3>
                <p className="rf-cliente-profile__card-subtitle">
                  Mesma composição exibida no detalhe antigo.
                </p>
              </div>
            </div>
            <PedidoItemsSection
              itens={itens}
              produtos={[]}
              tipo={pedido.tipo ?? 'varejo'}
              readOnly
            />
          </section>
        </section>
      ) : null}

      {activeTab === 'pagamento' ? (
        <section className="rf-cliente-profile__tab-panel">
          <div className="rf-cliente-profile__summary-grid">
            <section className="rf-cliente-profile__card">
              <div className="rf-cliente-profile__card-head">
                <h3 className="rf-cliente-profile__card-title">Condição de pagamento</h3>
              </div>
              <InfoTable
                rows={[
                  { label: 'Forma', value: PGTO_LABEL[pedido.pgto ?? ''] ?? pedido.pgto },
                  { label: 'Prazo', value: PRAZO_LABEL[pedido.prazo ?? ''] ?? pedido.prazo },
                  { label: 'Total', value: formatCurrency(pedido.total) },
                  {
                    label: 'Metadados',
                    value: pedido.pgto_meta ? JSON.stringify(pedido.pgto_meta) : null
                  }
                ]}
              />
            </section>

            <section className="rf-cliente-profile__card">
              <div className="rf-cliente-profile__card-head">
                <div>
                  <h3 className="rf-cliente-profile__card-title">Financeiro vinculado</h3>
                  <p className="rf-cliente-profile__card-subtitle">
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
              {actionMessage ? <p className="table-cell-muted">{actionMessage}</p> : null}
            </section>
          </div>
        </section>
      ) : null}

      {activeTab === 'logistica' ? (
        <section className="rf-cliente-profile__tab-panel">
          <section className="rf-cliente-profile__card">
            <div className="rf-cliente-profile__card-head">
              <h3 className="rf-cliente-profile__card-title">Entrega e logística</h3>
            </div>
            <InfoTable
              rows={[
                { label: 'Status operacional', value: PEDIDO_STATUS_LABEL[status] || status },
                { label: 'Origem da venda', value: pedido.origem_venda },
                { label: 'Entrega confirmada em', value: formatDateTime(pedido.entregue_em) },
                { label: 'Entrega confirmada por', value: pedido.entregue_por },
                {
                  label: 'Tipo',
                  value:
                    pedido.tipo === 'atacado'
                      ? 'Atacado'
                      : pedido.tipo === 'varejo'
                        ? 'Varejo'
                        : pedido.tipo
                },
                { label: 'Data do pedido', value: formatDate(pedido.data) },
                { label: 'Observação', value: pedido.obs }
              ]}
            />
          </section>
        </section>
      ) : null}

      {activeTab === 'historico' ? (
        <section className="rf-cliente-profile__tab-panel">
          <div className="rf-cliente-profile__tab-stack">
            <section className="rf-cliente-profile__card">
              <div className="rf-cliente-profile__card-head">
                <h3 className="rf-cliente-profile__card-title">Histórico do pedido</h3>
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

            <section className="rf-cliente-profile__card">
              <div className="rf-cliente-profile__card-head">
                <h3 className="rf-cliente-profile__card-title">Baixas financeiras</h3>
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
        <section className="rf-cliente-profile__tab-panel">
          <section className="rf-cliente-profile__card">
            <div className="rf-cliente-profile__card-head">
              <div>
                <h3 className="rf-cliente-profile__card-title">Cadastro do pedido</h3>
                <p className="rf-cliente-profile__card-subtitle">
                  Dados brutos principais disponíveis na origem atual.
                </p>
              </div>
            </div>
            <div className="rf-cliente-profile__cadastro-grid">
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
