import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { postLegacyBridgeMessage, subscribeLegacyBridgeMessages } from '../../../app/legacy/bridgeMessaging';
import { emitToast } from '../../../app/legacy/events';
import { useContasReceberStore } from '../store/useContasReceberStore';
import type { CrTab } from '../store/useContasReceberStore';
import {
  useContasReceberMutations,
  getValorRecebido,
  getValorEmAberto,
  getStatusLabel,
  getStatusEfetivo
} from '../hooks/useContasReceberMutations';
import type { ContaReceber, ContaReceberBaixa } from '../../../../types/domain';

const MESSAGE_SOURCE = 'receber-react-pilot';
const COMMAND_SOURCE = 'receber-legacy-shell';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ cr }: { cr: ContaReceber }) {
  const label = getStatusLabel(cr);
  const tone = label === 'Recebido' ? 'bg' : label === 'Parcial' ? 'ba' : 'bk';
  return <span className={`bdg ${tone}`}>{label}</span>;
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
      <details className="cr-baixas-details">
        <summary className="cr-baixas-summary" onClick={() => setOpen(!open)}>
          <span>Ver histórico de baixas</span>
          <span className="table-cell-caption table-cell-muted">Expandir</span>
        </summary>
        <div className="cr-baixas-body">
          <div className="empty-inline">Sem baixas registradas para esta conta.</div>
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
              {baixa.observacao && <div className="table-cell-caption">{baixa.observacao}</div>}
              <div className="fg2">
                <button className="btn btn-sm" onClick={() => onEstornar(contaId, baixa.id)}>
                  Estornar
                </button>
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
      <button className="btn btn-sm" onClick={onDesfazer}>
        Desfazer
      </button>
    );
  }
  return (
    <div className="fg2">
      <button className="btn btn-sm" onClick={onBaixaParcial}>
        Baixa parcial
      </button>
      <button className="btn btn-sm btn-p" onClick={onReceber}>
        Receber tudo
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desktop table row
// ---------------------------------------------------------------------------

type ContaRowDesktopProps = {
  conta: ContaReceber;
  baixas: ContaReceberBaixa[];
  statusEfetivo: 'pendente_ok' | 'vencido' | 'recebido';
  inFlight: boolean;
  onReceber: () => void;
  onBaixaParcial: () => void;
  onDesfazer: () => void;
  onEstornar: (contaId: string, baixaId: string) => void;
};

function ContaRowDesktop({
  conta,
  baixas,
  statusEfetivo,
  inFlight,
  onReceber,
  onBaixaParcial,
  onDesfazer,
  onEstornar
}: ContaRowDesktopProps) {
  const recebido = getValorRecebido(conta);
  const aberto = getValorEmAberto(conta);
  const ultimaBaixa = baixas[0] ?? null;

  return (
    <>
      <tr>
        <td>
          <div className="table-cell-strong">{conta.cliente}</div>
          <div className="table-cell-caption">
            <StatusBadge cr={conta} />
          </div>
        </td>
        <td className="table-cell-muted">{conta.pedido_num ? `#${conta.pedido_num}` : '-'}</td>
        <td className="table-cell-strong">{fmt(conta.valor)}</td>
        <td className="table-cell-strong tone-success">{fmt(recebido)}</td>
        <td className={`table-cell-strong ${aberto > 0 ? 'tone-warning' : 'tone-success'}`}>
          {fmt(aberto)}
        </td>
        <td
          className={
            statusEfetivo === 'vencido' ? 'tone-danger table-cell-strong' : 'table-cell-muted'
          }
        >
          {conta.vencimento}
        </td>
        <td>
          {ultimaBaixa ? (
            <>
              <div className="table-cell-strong">{fmt(ultimaBaixa.valor)}</div>
              <div className="table-cell-caption table-cell-muted">
                {formatDateTimeLabel(ultimaBaixa.recebido_em)}
              </div>
            </>
          ) : (
            <span className="table-cell-muted">Sem baixas</span>
          )}
        </td>
        <td>
          <ContaActions
            cr={conta}
            inFlight={inFlight}
            onReceber={onReceber}
            onBaixaParcial={onBaixaParcial}
            onDesfazer={onDesfazer}
          />
        </td>
      </tr>
      <tr className="cr-baixas-row">
        <td colSpan={8}>
          <BaixaHistorico baixas={baixas} contaId={conta.id} onEstornar={onEstornar} />
        </td>
      </tr>
    </>
  );
}

// ---------------------------------------------------------------------------
// Mobile card
// ---------------------------------------------------------------------------

type ContaCardMobileProps = {
  conta: ContaReceber;
  baixas: ContaReceberBaixa[];
  inFlight: boolean;
  onReceber: () => void;
  onBaixaParcial: () => void;
  onDesfazer: () => void;
  onEstornar: (contaId: string, baixaId: string) => void;
};

function ContaCardMobile({
  conta,
  baixas,
  inFlight,
  onReceber,
  onBaixaParcial,
  onDesfazer,
  onEstornar
}: ContaCardMobileProps) {
  const recebido = getValorRecebido(conta);
  const aberto = getValorEmAberto(conta);

  return (
    <div className="mobile-card">
      <div className="mobile-card-head">
        <div className="mobile-card-grow">
          <div className="mobile-card-title">
            {conta.cliente}
            {conta.pedido_num ? ` - Ped. #${conta.pedido_num}` : ''}
          </div>
          <div className="mobile-card-sub">Vencimento: {conta.vencimento}</div>
        </div>
        <div>
          <StatusBadge cr={conta} />
        </div>
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
          Ultima baixa:{' '}
          <b>{formatDateTimeLabel(conta.ultimo_recebimento_em ?? conta.recebido_em)}</b>
        </div>
      </div>
      <div className="mobile-card-actions">
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
  );
}

// ---------------------------------------------------------------------------
// Contas list (one tab)
// ---------------------------------------------------------------------------

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
  onEstornar
}: ContasListProps) {
  const q = searchQuery.toLowerCase();
  const filtered = [...contas]
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .filter(
      (c) =>
        getStatusEfetivo(c) === statusEfetivo &&
        (!q ||
          c.cliente.toLowerCase().includes(q) ||
          String(c.pedido_num ?? '').includes(q) ||
          getStatusLabel(c).toLowerCase().includes(q))
    );

  if (!filtered.length) {
    return (
      <div className="empty">
        <div className="ico">CR</div>
        <p>Nenhum lançamento encontrado.</p>
      </div>
    );
  }

  const isMobile = window.matchMedia('(max-width: 1080px)').matches;

  if (isMobile) {
    return (
      <>
        {filtered.map((conta) => {
          const baixas = allBaixas
            .filter((b) => b.conta_receber_id === conta.id)
            .sort((a, b) => String(b.recebido_em || '').localeCompare(String(a.recebido_em || '')));
          return (
            <ContaCardMobile
              key={conta.id}
              conta={conta}
              baixas={baixas}
              inFlight={inFlight.has(conta.id)}
              onReceber={() => onReceber(conta.id)}
              onBaixaParcial={() => onBaixaParcial(conta.id)}
              onDesfazer={() => onDesfazer(conta.id)}
              onEstornar={onEstornar}
            />
          );
        })}
      </>
    );
  }

  return (
    <div className="tw">
      <table className="tbl">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Pedido</th>
            <th>Total</th>
            <th>Recebido</th>
            <th>Em aberto</th>
            <th>Vencimento</th>
            <th>Ultima baixa</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((conta) => {
            const baixas = allBaixas
              .filter((b) => b.conta_receber_id === conta.id)
              .sort((a, b) =>
                String(b.recebido_em || '').localeCompare(String(a.recebido_em || ''))
              );
            return (
              <ContaRowDesktop
                key={conta.id}
                conta={conta}
                baixas={baixas}
                statusEfetivo={statusEfetivo}
                inFlight={inFlight.has(conta.id)}
                onReceber={() => onReceber(conta.id)}
                onBaixaParcial={() => onBaixaParcial(conta.id)}
                onDesfazer={() => onDesfazer(conta.id)}
                onEstornar={onEstornar}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

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
    <div className="mg bento-band">
      <div className="met">
        <div className="ml">Em aberto</div>
        <div className="mv kpi-value-sm tone-warning">{fmt(totalPendente)}</div>
      </div>
      <div className="met">
        <div className="ml">Vencido</div>
        <div className="mv kpi-value-sm tone-danger">{fmt(totalVencido)}</div>
      </div>
      <div className="met">
        <div className="ml">Recebido no mês</div>
        <div className="mv kpi-value-sm tone-success">{fmt(recebidoMes)}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Baixa Parcial Modal
// ---------------------------------------------------------------------------

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
    <div className="modal-wrap" style={{ display: 'flex' }}>
      <div className="modal-bg" onClick={onCancelar} />
      <div className="modal">
        <div className="modal-head">
          <div className="modal-title" id="cr-parcial-titulo">
            Registrar baixa - {conta.cliente}
            {conta.pedido_num ? ` (#${conta.pedido_num})` : ''}
          </div>
        </div>
        <div className="modal-body">
          <div className="form-section-card form-gap-bottom-xs">
            <div className="form-section-head">
              <div>
                <div className="form-section-title">Resumo da conta</div>
                <p className="form-section-copy">
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
          {error && (
            <div className="alert alert-danger" style={{ marginTop: '0.75rem' }}>
              {error}
            </div>
          )}
          <div className="form-row">
            <label className="form-label">Valor recebido</label>
            <input
              ref={valorRef}
              className="inp"
              type="number"
              step="0.01"
              min="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
            <div className="form-quick-actions">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => applySuggestedAmount(0.25)}
              >
                25%
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => applySuggestedAmount(0.5)}
              >
                50%
              </button>
              <button type="button" className="btn btn-sm" onClick={() => applySuggestedAmount(1)}>
                Quitar saldo
              </button>
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">Data / hora</label>
            <input
              className="inp"
              type="datetime-local"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label className="form-label">Observação (opcional)</label>
            <input
              className="inp"
              type="text"
              placeholder="Ex: Pix, transferência..."
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-p" onClick={handleConfirmar} disabled={submitting}>
            {submitting ? 'Salvando...' : 'Confirmar baixa'}
          </button>
          <button className="btn" onClick={onCancelar} disabled={submitting}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const TABS: { key: CrTab; label: string; statusEfetivo: 'pendente_ok' | 'vencido' | 'recebido' }[] =
  [
    { key: 'pendentes', label: 'Pendentes', statusEfetivo: 'pendente_ok' },
    { key: 'vencidos', label: 'Vencidos', statusEfetivo: 'vencido' },
    { key: 'recebidos', label: 'Recebidos', statusEfetivo: 'recebido' }
  ];

export function ContasReceberPilotPage() {
  const contas = useContasReceberStore(useShallow((s) => s.contas));
  const baixas = useContasReceberStore(useShallow((s) => s.baixas));
  const status = useContasReceberStore((s) => s.status);
  const error = useContasReceberStore((s) => s.error);
  const activeTab = useContasReceberStore((s) => s.activeTab);
  const setActiveTab = useContasReceberStore((s) => s.setActiveTab);
  const searchQuery = useContasReceberStore((s) => s.searchQuery);
  const setSearchQuery = useContasReceberStore((s) => s.setSearchQuery);
  const inFlight = useContasReceberStore(useShallow((s) => s.inFlight));

  const { registrarBaixa, marcarRecebido, marcarPendente, estornarBaixa } =
    useContasReceberMutations();

  const [baixaParcialContaId, setBaixaParcialContaId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const baixaParcialConta = baixaParcialContaId
    ? (contas.find((c) => c.id === baixaParcialContaId) ?? null)
    : null;

  // Comandos do shell legado
  useEffect(() => {
    return subscribeLegacyBridgeMessages(COMMAND_SOURCE, (data) => {
      if (data.type === 'receber:set-tab' && data.tab) {
        setActiveTab(data.tab as CrTab);
      }
    });
  }, [setActiveTab]);

  // Emite estado para o bridge
  useEffect(() => {
    const count = contas.filter((c) => getStatusEfetivo(c) !== 'recebido').length;
    postLegacyBridgeMessage({
        source: MESSAGE_SOURCE,
        type: 'receber:state',
        state: { tab: activeTab, status, count }
      });
  }, [activeTab, status, contas]);

  async function handleReceber(contaId: string) {
    const result = await marcarRecebido(contaId);
    if (!result.ok) {
      emitToast(result.error ?? 'Não foi possível registrar o recebimento agora.', 'error');
      return;
    }
    emitToast('Recebimento concluído. A conta já foi atualizada.', 'success');
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
    setBaixaParcialContaId(null);
  }

  async function handleDesfazer(contaId: string) {
    if (!confirm('Desfazer todas as baixas desta conta e voltar para pendente?')) return;
    const result = await marcarPendente(contaId);
    if (!result.ok) {
      emitToast(result.error ?? 'Não foi possível reabrir a conta agora.', 'error');
      return;
    }
    emitToast('Conta reaberta com sucesso. Ela voltou para pendente.', 'success');
  }

  async function handleEstornar(contaId: string, baixaId: string) {
    const conta = contas.find((c) => c.id === contaId);
    const baixa = baixas.find((b) => b.id === baixaId);
    if (!conta || !baixa) return;
    if (!confirm(`Estornar a baixa de ${fmt(baixa.valor)} para ${conta.cliente}?`)) return;
    const result = await estornarBaixa(contaId, baixaId);
    if (!result.ok) {
      emitToast(result.error ?? 'Não foi possível estornar a baixa agora.', 'error');
      return;
    }
    emitToast('Baixa estornada. Os totais da conta já foram recalculados.', 'success');
  }

  const activeTabConfig = TABS.find((t) => t.key === activeTab) ?? TABS[0];

  if (status === 'loading') {
    return (
      <div className="empty">
        <p>Carregando contas a receber...</p>
        <p className="table-cell-caption table-cell-muted">
          Estamos preparando saldos, baixas e pendências da filial ativa.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="empty">
        <p className="tone-danger">{error ?? 'Erro ao carregar dados.'}</p>
        <p className="table-cell-caption table-cell-muted">
          Atualize a tela ou confirme a filial ativa antes de tentar novamente.
        </p>
      </div>
    );
  }

  return (
    <>
      <ContasReceberMetrics contas={contas} baixas={baixas} />

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tb${activeTab === tab.key ? ' on' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tc on">
        <div className="card card-shell">
          <div className="toolbar toolbar-shell toolbar-shell--section">
            <div className="toolbar-main">
              <input
                className="inp input-w-sm"
                placeholder="Cliente ou pedido..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <ContasList
            contas={contas}
            allBaixas={baixas}
            statusEfetivo={activeTabConfig.statusEfetivo}
            inFlight={inFlight}
            searchQuery={searchQuery}
            onReceber={handleReceber}
            onBaixaParcial={handleAbrirBaixaParcial}
            onDesfazer={handleDesfazer}
            onEstornar={handleEstornar}
          />
        </div>
      </div>

      {baixaParcialConta && (
        <BaixaParcialModal
          conta={baixaParcialConta}
          onConfirmar={handleConfirmarBaixaParcial}
          onCancelar={() => setBaixaParcialContaId(null)}
          error={modalError}
          submitting={modalSubmitting}
        />
      )}
    </>
  );
}
