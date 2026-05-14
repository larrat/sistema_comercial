import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useToastStore } from '../../../app/lib/useToastStore';
import { useContasReceberStore } from '../store/useContasReceberStore';
import type { CrTab } from '../store/useContasReceberStore';
import {
  DataTable,
  Drawer,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  Modal,
  PageHeader,
  SegmentedControl,
  StatCard,
  StatusBadge,
  Button,
  Input
} from '../../../shared/ui';
import {
  useContasReceberMutations,
  getValorEmAberto,
  getValorRecebido,
  getStatusEfetivo,
  getStatusLabel
} from '../hooks/useContasReceberMutations';
import type { ContaReceber, ContaReceberBaixa } from '../../../../types/domain';
import { ContaReceberConfirmModal } from './ContaReceberConfirmModal';


type ContasReceberPilotPageProps = {
  routeIntent?: {
    contaId?: string | null;
  };
  onRetryLoad?: () => void;
};

type ConfirmState =
  | { kind: 'receber'; contaId: string }
  | { kind: 'desfazer'; contaId: string }
  | { kind: 'estorno'; contaId: string; baixaId: string }
  | null;

function hoje(): string {
  return new Date().toISOString().split('T')[0];
}

function fmt(value: number | string | undefined | null): string {
  const n = Number(value ?? 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTimeLabel(iso: string | null | undefined): string {
  if (!iso) return '-';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return String(iso).slice(0, 16).replace('T', ' ');
  return parsed.toLocaleString('pt-BR');
}

function toDateTimeLocalValue(date: Date = new Date()): string {
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocalValue(value: string): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function getStatusTone(cr: ContaReceber): 'success' | 'warning' | 'neutral' {
  const label = getStatusLabel(cr);
  if (label === 'Recebido') return 'success';
  if (label === 'Parcial') return 'warning';
  return 'neutral';
}

function FinanceStatusBadge({ cr }: { cr: ContaReceber }) {
  return <StatusBadge tone={getStatusTone(cr)}>{getStatusLabel(cr)}</StatusBadge>;
}

function getBaixasConta(allBaixas: ContaReceberBaixa[], contaId: string): ContaReceberBaixa[] {
  return allBaixas
    .filter((b) => b.conta_receber_id === contaId)
    .sort((a, b) => String(b.recebido_em || '').localeCompare(String(a.recebido_em || '')));
}

function filterContas(
  contas: ContaReceber[],
  statusEfetivo: 'pendente_ok' | 'vencido' | 'recebido',
  searchQuery: string
) {
  const q = searchQuery.toLowerCase();
  return [...contas]
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .filter(
      (c) =>
        getStatusEfetivo(c) === statusEfetivo &&
        (!q ||
          c.cliente.toLowerCase().includes(q) ||
          String(c.pedido_num ?? '').includes(q) ||
          getStatusLabel(c).toLowerCase().includes(q))
    );
}

type BaixaHistoricoProps = {
  baixas: ContaReceberBaixa[];
  contaId: string;
  onEstornar: (contaId: string, baixaId: string) => void;
};

function BaixaHistorico({ baixas, contaId, onEstornar }: BaixaHistoricoProps) {
  const [open, setOpen] = useState(false);

  if (!baixas.length) {
    return (
      <details className="cr-baixas-details bg-white/5 border border-white/5 rounded-lg overflow-hidden transition-all">
        <summary className="px-4 py-3 cursor-pointer select-none flex items-center justify-between hover:bg-white/5" onClick={() => setOpen(!open)}>
          <span className="text-sm font-bold text-slate-300">Ver histórico de baixas</span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Expandir</span>
        </summary>
        <div className="px-4 py-4 border-t border-white/5">
          <div className="text-xs text-slate-500 italic">Sem baixas registradas para esta conta.</div>
        </div>
      </details>
    );
  }

  const resumo = `${baixas.length} baixa${baixas.length > 1 ? 's' : ''} registrada${baixas.length > 1 ? 's' : ''}`;

  return (
    <details className="cr-baixas-details" open={open}>
      <summary
        className="cr-baixas-summary"
        onClick={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
      >
        <span>{resumo}</span>
        <span className="table-cell-caption table-cell-muted">Expandir</span>
      </summary>
      <div className="cr-baixas-body">
        <div className="cr-baixas-list">
          {baixas.map((baixa, index) => (
            <div key={baixa.id} className="cr-baixas-item">
              <div className="cr-baixas-item__head">
                <span className="table-cell-strong">Baixa {index + 1}</span>
                <span className="tone-success table-cell-strong">{fmt(baixa.valor)}</span>
              </div>
              <div className="table-cell-caption table-cell-muted">
                {formatDateTimeLabel(baixa.recebido_em)}
              </div>
              {baixa.observacao ? <div className="table-cell-caption">{baixa.observacao}</div> : null}
              <div className="fg2">
                <Button size="sm" onClick={() => onEstornar(contaId, baixa.id)}>
                  Estornar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

type ContaActionsProps = {
  cr: ContaReceber;
  inFlight: boolean;
  onReceber: () => void;
  onBaixaParcial: () => void;
  onDesfazer: () => void;
};

function ContaActions({ cr, inFlight, onReceber, onBaixaParcial, onDesfazer }: ContaActionsProps) {
  if (inFlight) {
    return <span className="table-cell-muted table-cell-caption">Salvando...</span>;
  }

  if (getStatusEfetivo(cr) === 'recebido') {
    return (
      <Button size="sm" onClick={onDesfazer}>
        Desfazer recebimento
      </Button>
    );
  }

  return (
    <div className="fg2">
      <Button size="sm" onClick={onBaixaParcial}>
        Baixa parcial
      </Button>
      <Button size="sm" variant="primary" onClick={onReceber}>
        Receber tudo
      </Button>
    </div>
  );
}

function ContasReceberMetrics({
  contas,
  baixas
}: {
  contas: ContaReceber[];
  baixas: ContaReceberBaixa[];
}) {
  const hj = hoje();
  const mesAtual = hj.slice(0, 7);

  const totalPendente = contas
    .filter((c) => getStatusEfetivo(c) !== 'recebido')
    .reduce((acc, c) => acc + getValorEmAberto(c), 0);

  const totalVencido = contas
    .filter((c) => getStatusEfetivo(c) !== 'recebido' && c.vencimento < hj)
    .reduce((acc, c) => acc + getValorEmAberto(c), 0);

  const baixasDoMes = baixas.filter((b) => String(b.recebido_em ?? '').slice(0, 7) === mesAtual);
  const contasComBaixaNoMes = new Set(baixasDoMes.map((b) => b.conta_receber_id));
  const totalBaixas = baixasDoMes.reduce((acc, b) => acc + Number(b.valor || 0), 0);
  const fallbackRecebidas = contas
    .filter(
      (c) =>
        getStatusEfetivo(c) === 'recebido' &&
        String(c.recebido_em ?? '').slice(0, 7) === mesAtual &&
        !contasComBaixaNoMes.has(c.id)
    )
    .reduce((acc, c) => acc + Number(c.valor || 0), 0);
  const recebidoMes = Number((totalBaixas + fallbackRecebidas).toFixed(2));

  return (
    <section className="rf-ui-stat-grid--3">
      <StatCard label="Em aberto" value={fmt(totalPendente)} tone="warning" />
      <StatCard label="Vencido" value={fmt(totalVencido)} tone="danger" />
      <StatCard label="Recebido no mês" value={fmt(recebidoMes)} tone="success" />
    </section>
  );
}

type BaixaParcialModalProps = {
  conta: ContaReceber;
  onConfirmar: (valor: number, recebidoEmIso: string, observacao: string | null) => void;
  onCancelar: () => void;
  error: string | null;
  submitting: boolean;
};

function BaixaParcialModal({
  conta,
  onConfirmar,
  onCancelar,
  error,
  submitting
}: BaixaParcialModalProps) {
  const aberto = getValorEmAberto(conta);
  const [valor, setValor] = useState(String(aberto));
  const [data, setData] = useState(toDateTimeLocalValue());
  const [obs, setObs] = useState('');
  const valorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    valorRef.current?.focus();
    valorRef.current?.select();
  }, []);

  function handleConfirmar() {
    const v = Number(valor);
    const iso = fromDateTimeLocalValue(data);
    const observacao = obs.trim() || null;
    onConfirmar(v, iso, observacao);
  }

  function applySuggestedAmount(percent: number) {
    const nextValue = percent >= 1 ? aberto : Number((aberto * percent).toFixed(2));
    setValor(String(nextValue));
  }

  return (
    <Modal
      open
      title={`Registrar baixa — ${conta.cliente}${conta.pedido_num ? ` (#${conta.pedido_num})` : ''}`}
      onClose={onCancelar}
      closeOnOverlay={!submitting}
      footer={
        <>
          <Button size="sm" onClick={onCancelar} disabled={submitting}>
            Cancelar
          </Button>
          <Button size="sm" variant="primary" onClick={handleConfirmar} loading={submitting}>
            Confirmar baixa
          </Button>
        </>
      }
    >
      <div className="rf-section-card mb-4">
        <div className="rf-ui-form-section__head">
          <div>
            <div className="rf-ui-form-section__title">Resumo da conta</div>
            <p className="rf-ui-form-section__description">
              Use o valor real recebido. O saldo restante continua aberto automaticamente.
            </p>
          </div>
        </div>
        <div className="form-summary-grid">
          <div className="form-summary-item">
            <span className="table-cell-caption table-cell-muted">Total</span>
            <strong>{fmt(conta.valor)}</strong>
          </div>
          <div className="form-summary-item">
            <span className="table-cell-caption table-cell-muted">Recebido</span>
            <strong>{fmt(getValorRecebido(conta))}</strong>
          </div>
          <div className="form-summary-item">
            <span className="table-cell-caption table-cell-muted">Em aberto</span>
            <strong>{fmt(aberto)}</strong>
          </div>
        </div>
      </div>

      {error ? <ErrorState title={error} compact /> : null}

      <div className="flex flex-col gap-4">
        <Input
          ref={valorRef as any}
          label="Valor recebido"
          type="number"
          step="0.01"
          min="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={() => applySuggestedAmount(0.25)}>
            25%
          </Button>
          <Button type="button" size="sm" onClick={() => applySuggestedAmount(0.5)}>
            50%
          </Button>
          <Button type="button" size="sm" onClick={() => applySuggestedAmount(1)}>
            Quitar saldo
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <Input
          label="Data / hora"
          type="datetime-local"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <Input
          label="Observação (opcional)"
          placeholder="Ex: Pix, transferência..."
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />
      </div>
    </Modal>
  );
}

type ContaDetailDrawerProps = {
  conta: ContaReceber | null;
  baixas: ContaReceberBaixa[];
  inFlight: boolean;
  open: boolean;
  onClose: () => void;
  onReceber: () => void;
  onBaixaParcial: () => void;
  onDesfazer: () => void;
  onEstornar: (contaId: string, baixaId: string) => void;
};

function ContaDetailDrawer({
  conta,
  baixas,
  inFlight,
  open,
  onClose,
  onReceber,
  onBaixaParcial,
  onDesfazer,
  onEstornar
}: ContaDetailDrawerProps) {
  if (!conta) return null;

  const recebido = getValorRecebido(conta);
  const aberto = getValorEmAberto(conta);

  return (
    <Drawer
      open={open}
      title={conta.cliente}
      subtitle={[
        conta.pedido_num ? `Pedido #${conta.pedido_num}` : null,
        `Vencimento ${conta.vencimento}`,
        getStatusLabel(conta)
      ]
        .filter(Boolean)
        .join(' · ')}
      onClose={onClose}
    >
      <div className="rf-ui-stack">
        <div className="rf-ui-stat-grid--3">
          <StatCard label="Total" value={fmt(conta.valor)} />
          <StatCard label="Recebido" value={fmt(recebido)} tone="success" />
          <StatCard label="Em aberto" value={fmt(aberto)} tone={aberto > 0 ? 'warning' : 'success'} />
        </div>

        <div className="rf-ui-stack" style={{ gap: 8 }}>
          <div className="table-cell-caption table-cell-muted">Ações da conta</div>
          <ContaActions
            cr={conta}
            inFlight={inFlight}
            onReceber={onReceber}
            onBaixaParcial={onBaixaParcial}
            onDesfazer={onDesfazer}
          />
        </div>

        <BaixaHistorico baixas={baixas} contaId={conta.id} onEstornar={onEstornar} />
      </div>
    </Drawer>
  );
}

type ContasListProps = {
  contas: ContaReceber[];
  allBaixas: ContaReceberBaixa[];
  statusEfetivo: 'pendente_ok' | 'vencido' | 'recebido';
  inFlight: Set<string>;
  searchQuery: string;
  onReceber: (contaId: string) => void;
  onBaixaParcial: (contaId: string) => void;
  onDesfazer: (contaId: string) => void;
  onEstornar: (contaId: string, baixaId: string) => void;
  onOpenDetail: (contaId: string) => void;
};

function ContasList({
  contas,
  allBaixas,
  statusEfetivo,
  inFlight,
  searchQuery,
  onReceber,
  onBaixaParcial,
  onDesfazer,
  onEstornar,
  onOpenDetail
}: ContasListProps) {
  const filtered = filterContas(contas, statusEfetivo, searchQuery);

  if (!filtered.length) {
    return (
      <EmptyState
        title="Nenhum lançamento encontrado."
        description="Ajuste a busca ou troque o status para visualizar outros títulos."
      />
    );
  }

  const isMobile = window.matchMedia('(max-width: 1080px)').matches;

  if (isMobile) {
    return (
      <div className="rf-ui-stack">
        {filtered.map((conta) => {
          const baixas = getBaixasConta(allBaixas, conta.id);
          const recebido = getValorRecebido(conta);
          const aberto = getValorEmAberto(conta);

          return (
            <div key={conta.id} className="mobile-card">
              <div className="mobile-card-head">
                <div className="mobile-card-grow">
                  <div className="mobile-card-title">
                    {conta.cliente}
                    {conta.pedido_num ? ` - Ped. #${conta.pedido_num}` : ''}
                  </div>
                  <div className="mobile-card-sub">Vencimento: {conta.vencimento}</div>
                </div>
                <FinanceStatusBadge cr={conta} />
              </div>

              <div className="mobile-card-meta mobile-card-meta-gap">
                <div>
                  Total: <b>{fmt(conta.valor)}</b>
                </div>
                <div>
                  Recebido: <b>{fmt(recebido)}</b>
                </div>
                <div>
                  Em aberto: <b>{fmt(aberto)}</b>
                </div>
                <div>
                  Última baixa: <b>{formatDateTimeLabel(conta.ultimo_recebimento_em ?? conta.recebido_em)}</b>
                </div>
              </div>

              <div className="mobile-card-actions">
                <Button size="sm" onClick={() => onOpenDetail(conta.id)}>
                  Detalhes
                </Button>
                <ContaActions
                  cr={conta}
                  inFlight={inFlight.has(conta.id)}
                  onReceber={() => onReceber(conta.id)}
                  onBaixaParcial={() => onBaixaParcial(conta.id)}
                  onDesfazer={() => onDesfazer(conta.id)}
                />
              </div>

              <BaixaHistorico baixas={baixas} contaId={conta.id} onEstornar={onEstornar} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <DataTable
      data={filtered}
      rowKey={(row) => row.id}
      onRowClick={(row) => onOpenDetail(row.id)}
      columns={[
        {
          key: 'cliente',
          header: 'Cliente',
          render: (conta) => (
            <div>
              <div className="table-cell-strong">{conta.cliente}</div>
              <div className="table-cell-caption">
                <FinanceStatusBadge cr={conta} />
              </div>
            </div>
          )
        },
        {
          key: 'pedido',
          header: 'Pedido',
          render: (conta) => <span className="table-cell-muted">{conta.pedido_num ? `#${conta.pedido_num}` : '—'}</span>
        },
        {
          key: 'total',
          header: 'Total',
          render: (conta) => <span className="table-cell-strong">{fmt(conta.valor)}</span>,
          align: 'right'
        },
        {
          key: 'recebido',
          header: 'Recebido',
          render: (conta) => <span className="table-cell-strong tone-success">{fmt(getValorRecebido(conta))}</span>,
          align: 'right'
        },
        {
          key: 'aberto',
          header: 'Em aberto',
          render: (conta) => {
            const aberto = getValorEmAberto(conta);
            return (
              <span className={`table-cell-strong ${aberto > 0 ? 'tone-warning' : 'tone-success'}`}>
                {fmt(aberto)}
              </span>
            );
          },
          align: 'right'
        },
        {
          key: 'vencimento',
          header: 'Vencimento',
          render: (conta) => (
            <span className={getStatusEfetivo(conta) === 'vencido' ? 'tone-danger table-cell-strong' : 'table-cell-muted'}>
              {conta.vencimento}
            </span>
          )
        },
        {
          key: 'ultima_baixa',
          header: 'Última baixa',
          render: (conta) => {
            const ultimaBaixa = getBaixasConta(allBaixas, conta.id)[0] ?? null;
            return ultimaBaixa ? (
              <>
                <div className="table-cell-strong">{fmt(ultimaBaixa.valor)}</div>
                <div className="table-cell-caption table-cell-muted">
                  {formatDateTimeLabel(ultimaBaixa.recebido_em)}
                </div>
              </>
            ) : (
              <span className="table-cell-muted">Sem baixas</span>
            );
          }
        }
      ]}
      renderActions={(conta) => (
        <ContaActions
          cr={conta}
          inFlight={inFlight.has(conta.id)}
          onReceber={() => onReceber(conta.id)}
          onBaixaParcial={() => onBaixaParcial(conta.id)}
          onDesfazer={() => onDesfazer(conta.id)}
        />
      )}
    />
  );
}

const TABS: { key: CrTab; label: string; statusEfetivo: 'pendente_ok' | 'vencido' | 'recebido' }[] = [
  { key: 'pendentes', label: 'Pendentes', statusEfetivo: 'pendente_ok' },
  { key: 'vencidos', label: 'Vencidos', statusEfetivo: 'vencido' },
  { key: 'recebidos', label: 'Recebidos', statusEfetivo: 'recebido' }
];

export function ContasReceberPilotPage({ routeIntent, onRetryLoad }: ContasReceberPilotPageProps) {
  const contas = useContasReceberStore(useShallow((s) => s.contas));
  const baixas = useContasReceberStore(useShallow((s) => s.baixas));
  const status = useContasReceberStore((s) => s.status);
  const error = useContasReceberStore((s) => s.error);
  const activeTab = useContasReceberStore((s) => s.activeTab);
  const setActiveTab = useContasReceberStore((s) => s.setActiveTab);
  const searchQuery = useContasReceberStore((s) => s.searchQuery);
  const setSearchQuery = useContasReceberStore((s) => s.setSearchQuery);
  const inFlight = useContasReceberStore(useShallow((s) => s.inFlight));

  const { registrarBaixa, marcarRecebido, marcarPendente, estornarBaixa } = useContasReceberMutations();

  const [baixaParcialContaId, setBaixaParcialContaId] = useState<string | null>(null);
  const [detailContaId, setDetailContaId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const baixaParcialConta = baixaParcialContaId ? contas.find((c) => c.id === baixaParcialContaId) ?? null : null;
  const detailConta = detailContaId ? contas.find((c) => c.id === detailContaId) ?? null : null;
  const detailBaixas = detailConta ? getBaixasConta(baixas, detailConta.id) : [];
  const activeTabConfig = TABS.find((t) => t.key === activeTab) ?? TABS[0];
  const filteredContas = useMemo(
    () => filterContas(contas, activeTabConfig.statusEfetivo, searchQuery),
    [contas, activeTabConfig.statusEfetivo, searchQuery]
  );
  const activeFilterCount = (searchQuery ? 1 : 0) + (activeTab !== 'pendentes' ? 1 : 0);

  useEffect(() => {
    if (!routeIntent?.contaId) return;
    setDetailContaId(routeIntent.contaId);
  }, [routeIntent?.contaId]);

  async function handleReceber(contaId: string) {
    const result = await marcarRecebido(contaId);
    if (!result.ok) {
      useToastStore.getState().addToast(result.error ?? 'Não foi possível registrar o recebimento agora.', 'error');
      return false;
    }
    useToastStore.getState().addToast('Recebimento concluído. A conta já foi atualizada.', 'success');
    return true;
  }

  function handleAbrirBaixaParcial(contaId: string) {
    setModalError(null);
    setBaixaParcialContaId(contaId);
  }

  async function handleConfirmarBaixaParcial(
    valor: number,
    recebidoEmIso: string,
    observacao: string | null
  ) {
    if (!baixaParcialContaId) return;
    setModalSubmitting(true);
    setModalError(null);
    const result = await registrarBaixa(baixaParcialContaId, valor, recebidoEmIso, observacao);
    setModalSubmitting(false);
    if (!result.ok) {
      setModalError(result.error ?? 'Erro ao registrar baixa.');
      return;
    }
    useToastStore.getState().addToast('Baixa registrada. Os valores da conta já foram atualizados.', 'success');
    setBaixaParcialContaId(null);
  }

  async function handleDesfazer(contaId: string) {
    const result = await marcarPendente(contaId);
    if (!result.ok) {
      useToastStore.getState().addToast(result.error ?? 'Não foi possível reabrir a conta agora.', 'error');
      return false;
    }
    useToastStore.getState().addToast('Conta reaberta com sucesso. Ela voltou para pendente.', 'success');
    return true;
  }

  async function handleEstornar(contaId: string, baixaId: string) {
    const result = await estornarBaixa(contaId, baixaId);
    if (!result.ok) {
      useToastStore.getState().addToast(result.error ?? 'Não foi possível estornar a baixa agora.', 'error');
      return false;
    }
    useToastStore.getState().addToast('Baixa estornada. Os totais da conta já foram recalculados.', 'success');
    return true;
  }

  async function handleConfirmAction() {
    if (!confirmState) return;

    if (confirmState.kind === 'receber') {
      const ok = await handleReceber(confirmState.contaId);
      if (ok) setConfirmState(null);
      return;
    }

    if (confirmState.kind === 'desfazer') {
      const ok = await handleDesfazer(confirmState.contaId);
      if (ok) setConfirmState(null);
      return;
    }

    const ok = await handleEstornar(confirmState.contaId, confirmState.baixaId);
    if (ok) setConfirmState(null);
  }

  const confirmConta = confirmState ? contas.find((c) => c.id === confirmState.contaId) ?? null : null;
  const confirmBaixa =
    confirmState?.kind === 'estorno'
      ? baixas.find((b) => b.id === confirmState.baixaId && b.conta_receber_id === confirmState.contaId) ?? null
      : null;
  const confirmSubmitting = confirmState ? inFlight.has(confirmState.contaId) : false;

  const confirmTitle =
    confirmState?.kind === 'receber'
      ? 'Confirmar recebimento total'
      : confirmState?.kind === 'desfazer'
        ? 'Desfazer recebimento'
        : 'Confirmar estorno';

  const confirmDescription =
    confirmState?.kind === 'receber'
      ? 'Esta ação quita o valor em aberto da conta usando a data atual.'
      : confirmState?.kind === 'desfazer'
        ? 'Esta ação remove o estado de quitada e devolve a conta para pendente.'
        : 'Esta ação estorna a baixa selecionada e recalcula os totais da conta.';

  const confirmLabel =
    confirmState?.kind === 'receber'
      ? 'Receber tudo'
      : confirmState?.kind === 'desfazer'
        ? 'Desfazer recebimento'
        : 'Estornar baixa';

  if (status === 'loading') {
    return (
      <div className="w-full flex flex-col gap-8">
        <PageHeader
          kicker="Financeiro"
          title="Contas a Receber"
          description="Acompanhe títulos em aberto, vencimentos e recebimentos da filial ativa."
          actions={
            onRetryLoad ? (
              <Button size="sm" type="button" onClick={onRetryLoad}>
                Atualizar
              </Button>
            ) : undefined
          }
        />
        <ContasReceberMetrics contas={contas} baixas={baixas} />
        <LoadingState
          title="Carregando contas a receber..."
          description="Estamos reunindo títulos, baixas e indicadores financeiros da filial."
        />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-full flex flex-col gap-8">
        <PageHeader
          kicker="Financeiro"
          title="Contas a Receber"
          description="Acompanhe títulos em aberto, vencimentos e recebimentos da filial ativa."
          actions={
            onRetryLoad ? (
              <Button size="sm" type="button" onClick={onRetryLoad}>
                Atualizar
              </Button>
            ) : undefined
          }
        />
        <ContasReceberMetrics contas={contas} baixas={baixas} />
        <ErrorState
          title={error ?? 'Erro ao carregar dados.'}
          description="Atualize a tela ou confirme a filial ativa antes de tentar novamente."
          onRetry={onRetryLoad}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8">
      <PageHeader
        kicker="Financeiro"
        title="Contas a Receber"
        description="Acompanhe títulos em aberto, baixas e vencimentos sem sair do fluxo operacional."
        actions={
          <div className="flex items-center gap-3">
            {onRetryLoad ? (
              <Button size="sm" onClick={onRetryLoad}>
                Atualizar
              </Button>
            ) : null}
          </div>
        }
      />

      <ContasReceberMetrics contas={contas} baixas={baixas} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <SegmentedControl
          options={TABS.map(t => ({ id: t.key, label: t.label }))}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as CrTab)}
        />
        
        <div className="flex items-center gap-2">
          <StatusBadge tone="info">{filteredContas.length} títulos visíveis</StatusBadge>
        </div>
      </div>

      <FilterBar
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: 'Buscar por cliente, pedido ou status...',
          ariaLabel: 'Buscar contas a receber'
        }}
        activeFilterCount={searchQuery ? 1 : 0}
        onClearFilters={searchQuery ? () => setSearchQuery('') : undefined}
      />

      <ContasList
        contas={contas}
        allBaixas={baixas}
        statusEfetivo={activeTabConfig.statusEfetivo}
        inFlight={inFlight}
        searchQuery={searchQuery}
        onReceber={(contaId) => setConfirmState({ kind: 'receber', contaId })}
        onBaixaParcial={handleAbrirBaixaParcial}
        onDesfazer={(contaId) => setConfirmState({ kind: 'desfazer', contaId })}
        onEstornar={(contaId, baixaId) => setConfirmState({ kind: 'estorno', contaId, baixaId })}
        onOpenDetail={setDetailContaId}
      />

      {baixaParcialConta ? (
        <BaixaParcialModal
          conta={baixaParcialConta}
          onConfirmar={handleConfirmarBaixaParcial}
          onCancelar={() => setBaixaParcialContaId(null)}
          error={modalError}
          submitting={modalSubmitting}
        />
      ) : null}

      <ContaDetailDrawer
        open={!!detailConta}
        conta={detailConta}
        baixas={detailBaixas}
        inFlight={detailConta ? inFlight.has(detailConta.id) : false}
        onClose={() => setDetailContaId(null)}
        onReceber={() => {
          if (detailConta) setConfirmState({ kind: 'receber', contaId: detailConta.id });
        }}
        onBaixaParcial={() => {
          if (detailConta) handleAbrirBaixaParcial(detailConta.id);
        }}
        onDesfazer={() => {
          if (detailConta) setConfirmState({ kind: 'desfazer', contaId: detailConta.id });
        }}
        onEstornar={(contaId, baixaId) => setConfirmState({ kind: 'estorno', contaId, baixaId })}
      />

      <ContaReceberConfirmModal
        open={!!confirmState && !!confirmConta}
        title={confirmTitle}
        description={confirmDescription}
        contaLabel={
          confirmConta
            ? `${confirmConta.cliente}${confirmConta.pedido_num ? ` — Pedido #${confirmConta.pedido_num}` : ''}`
            : ''
        }
        valorLabel={
          confirmState?.kind === 'receber'
            ? confirmConta
              ? fmt(getValorEmAberto(confirmConta))
              : undefined
            : confirmState?.kind === 'estorno'
              ? confirmBaixa
                ? fmt(confirmBaixa.valor)
                : undefined
              : undefined
        }
        submitting={confirmSubmitting}
        confirmLabel={confirmLabel}
        onClose={() => {
          if (!confirmSubmitting) setConfirmState(null);
        }}
        onConfirm={() => {
          void handleConfirmAction();
        }}
      />
    </div>
  );
}
