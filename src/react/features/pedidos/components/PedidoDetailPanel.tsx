import { useEffect, useState } from 'react';
import { D } from '../../../../app/store.js';
import { marcarRecebido, abrirBaixaParcial } from '../../../../features/contas-receber.js';
import { useFilialStore } from '../../../app/useFilialStore';
import type { Pedido, PedidoItem } from '../../../../types/domain';
import type { ContaReceber, ContaReceberBaixa } from '../../../../types/domain';
import { usePedidoMutations } from '../hooks/usePedidoMutations';
import { PedidoItemsSection } from './PedidoItemsSection';
import { ACAO_LABEL, NEXT_STATUS, normalizePedStatus } from '../types';

type Props = {
  pedido: Pedido;
  onEditar: (id: string) => void;
  onClose: () => void;
};

const STATUS_LABEL: Record<string, string> = {
  orcamento: 'Orçamento',
  confirmado: 'Confirmado',
  em_separacao: 'Em separação',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};

const STATUS_BADGE: Record<string, string> = {
  orcamento: 'bdg bk',
  confirmado: 'bdg bb',
  em_separacao: 'bdg ba',
  entregue: 'bdg bg',
  cancelado: 'bdg br'
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

function getContaStatusClass(conta: ContaReceber | null): string {
  const label = getContaStatusLabel(conta);
  if (label === 'Recebido') return 'bdg bg';
  if (label === 'Parcial') return 'bdg ba';
  return 'bdg bk';
}

function readContaFinanceira(
  filialId: string | null,
  pedidoId: string
): { conta: ContaReceber | null; baixas: ContaReceberBaixa[] } {
  if (!filialId) return { conta: null, baixas: [] };
  const contas = D.contasReceber?.[filialId] || [];
  const conta = contas.find((item) => item.pedido_id === pedidoId) || null;
  const baixas = conta
    ? (D.contasReceberBaixas?.[filialId] || [])
        .filter((item) => item.conta_receber_id === conta.id)
        .sort((a, b) => String(b.recebido_em || '').localeCompare(String(a.recebido_em || '')))
    : [];
  return { conta, baixas };
}

export function PedidoDetailPanel({ pedido, onEditar, onClose }: Props) {
  const { avancarStatus, cancelarPedido, reabrirPedido, gerarContaManual, inFlight } =
    usePedidoMutations();
  const filialId = useFilialStore((state) => state.filialId);
  const [contaMsg, setContaMsg] = useState<string | null>(null);
  const [contaState, setContaState] = useState<{
    conta: ContaReceber | null;
    baixas: ContaReceberBaixa[];
  }>(() => readContaFinanceira(filialId, pedido.id));
  const status = normalizePedStatus(pedido.status);
  const badgeClass = STATUS_BADGE[status] ?? 'bdg bk';
  const statusLabel = STATUS_LABEL[status] ?? status;
  const nextStatus = NEXT_STATUS[status];
  const acaoLabel = ACAO_LABEL[status];
  const isInFlight = inFlight.has(pedido.id);
  const itens = parseItens(pedido);
  const conta = contaState.conta;
  const baixas = contaState.baixas;
  const valorRecebido = getValorRecebido(conta);
  const valorEmAberto = getValorEmAberto(conta);

  useEffect(() => {
    const sync = () => setContaState(readContaFinanceira(filialId, pedido.id));
    sync();
    window.addEventListener('sc:contas-receber-sync', sync);
    window.addEventListener('sc:conta-receber-criada', sync);
    return () => {
      window.removeEventListener('sc:contas-receber-sync', sync);
      window.removeEventListener('sc:conta-receber-criada', sync);
    };
  }, [filialId, pedido.id]);

  return (
    <div className="card card-shell" data-testid="pedido-detail-panel">
      <div className="modal-shell-head">
        <div>
          <div className="mt">Pedido #{pedido.num}</div>
          <div className="cli-react-shell__chips" style={{ marginTop: '0.25rem' }}>
            <span className={badgeClass}>{statusLabel}</span>
            {pedido.data && <span className="bdg bk">{pedido.data}</span>}
            <span className="bdg bg">{fmtCurrency(pedido.total)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <button
            className="btn btn-sm"
            onClick={() => onEditar(pedido.id)}
            data-testid="pedido-detail-editar"
          >
            Editar
          </button>
          <button className="btn btn-sm" onClick={onClose} data-testid="pedido-detail-close">
            Fechar
          </button>
        </div>
      </div>

      <div className="modal-shell-body">
        <div className="fg c3">
          <div>
            <div className="fl">Cliente</div>
            <div className="fv">{pedido.cli || '—'}</div>
          </div>
          {pedido.rca_nome && (
            <div>
              <div className="fl">RCA</div>
              <div className="fv">{pedido.rca_nome}</div>
            </div>
          )}
          <div>
            <div className="fl">Tipo</div>
            <div className="fv">{pedido.tipo === 'atacado' ? 'Atacado' : 'Varejo'}</div>
          </div>
          <div>
            <div className="fl">Pagamento</div>
            <div className="fv">{PGTO_LABEL[pedido.pgto ?? ''] ?? pedido.pgto ?? '—'}</div>
          </div>
          <div>
            <div className="fl">Prazo</div>
            <div className="fv">{PRAZO_LABEL[pedido.prazo ?? ''] ?? pedido.prazo ?? '—'}</div>
          </div>
          {pedido.obs && (
            <div>
              <div className="fl">Obs.</div>
              <div className="fv">{pedido.obs}</div>
            </div>
          )}
        </div>

        <PedidoItemsSection itens={itens} produtos={[]} tipo={pedido.tipo ?? 'varejo'} readOnly />

        <div className="panel" style={{ marginTop: '1rem' }}>
          <div className="pt">Financeiro do pedido</div>
          {conta ? (
            <>
              <div className="cli-react-shell__chips" style={{ marginTop: '0.5rem' }}>
                <span className={getContaStatusClass(conta)}>{getContaStatusLabel(conta)}</span>
                <span className="bdg bk">Vencimento {conta.vencimento}</span>
                <span className="bdg bg">Total {fmtCurrency(conta.valor)}</span>
              </div>

              <div className="fg c3" style={{ marginTop: '0.75rem' }}>
                <div>
                  <div className="fl">Recebido</div>
                  <div className="fv tone-success">{fmtCurrency(valorRecebido)}</div>
                </div>
                <div>
                  <div className="fl">Em aberto</div>
                  <div className={`fv ${valorEmAberto > 0 ? 'tone-warning' : 'tone-success'}`}>
                    {fmtCurrency(valorEmAberto)}
                  </div>
                </div>
                <div>
                  <div className="fl">Ultima baixa</div>
                  <div className="fv">
                    {formatDateTimeLabel(conta.ultimo_recebimento_em || conta.recebido_em)}
                  </div>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '0.75rem' }}>
                {valorEmAberto > 0 && (
                  <>
                    <button
                      className="btn btn-sm"
                      onClick={() => abrirBaixaParcial(conta.id)}
                      data-testid="pedido-detail-baixa-parcial"
                    >
                      Baixa parcial
                    </button>
                    <button
                      className="btn btn-sm btn-p"
                      onClick={() => void marcarRecebido(conta.id)}
                      data-testid="pedido-detail-receber-tudo"
                    >
                      Receber tudo
                    </button>
                  </>
                )}
              </div>

              <div style={{ marginTop: '0.75rem' }}>
                <div className="fl">Ultimas baixas</div>
                {baixas.length ? (
                  <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.4rem' }}>
                    {baixas.slice(0, 4).map((baixa) => (
                      <div key={baixa.id} className="panel" style={{ padding: '0.6rem 0.8rem' }}>
                        <div className="panel-inline-metrics">
                          <span>
                            <b>{fmtCurrency(baixa.valor)}</b>
                          </span>
                          <span>{formatDateTimeLabel(baixa.recebido_em)}</span>
                        </div>
                        {baixa.observacao && (
                          <div className="table-cell-caption" style={{ marginTop: '0.35rem' }}>
                            {baixa.observacao}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="table-cell-muted" style={{ marginTop: '0.4rem' }}>
                    Nenhuma baixa registrada ainda.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="table-cell-muted" style={{ marginTop: '0.5rem' }}>
              Nenhuma conta a receber vinculada a este pedido no momento.
            </p>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: '1rem' }}>
          {nextStatus && acaoLabel && (
            <button
              className="btn btn-sm"
              disabled={isInFlight}
              onClick={() => void avancarStatus(pedido)}
              data-testid="pedido-detail-avancar"
            >
              {isInFlight ? '...' : acaoLabel}
            </button>
          )}
          {status !== 'cancelado' && status !== 'entregue' && (
            <button
              className="btn btn-sm btn-danger"
              disabled={isInFlight}
              onClick={() => void cancelarPedido(pedido)}
              data-testid="pedido-detail-cancelar"
            >
              Cancelar
            </button>
          )}
          {status === 'cancelado' && (
            <button
              className="btn btn-sm"
              disabled={isInFlight}
              onClick={() => void reabrirPedido(pedido)}
              data-testid="pedido-detail-reabrir"
            >
              Reabrir
            </button>
          )}
          {status === 'entregue' && !conta && (
            <button
              className="btn btn-sm"
              disabled={isInFlight}
              onClick={() => {
                setContaMsg(null);
                void gerarContaManual(pedido).then((msg) => setContaMsg(msg));
              }}
              data-testid="pedido-detail-gerar-conta"
            >
              {isInFlight ? '...' : 'Gerar A Receber'}
            </button>
          )}
        </div>
        {contaMsg && (
          <div
            className={`bdg ${contaMsg.startsWith('Conta') ? 'bg' : 'br'}`}
            style={{ marginTop: '0.5rem', display: 'block', padding: '0.5rem' }}
          >
            {contaMsg}
          </div>
        )}
      </div>
    </div>
  );
}
