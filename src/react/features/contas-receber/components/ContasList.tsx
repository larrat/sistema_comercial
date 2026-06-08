import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import type { ContaReceber, ContaReceberBaixa } from '../../../../types/domain';
import { Button, DataTable, EmptyState } from '../../../shared/ui';
import { getStatusEfetivo, getValorEmAberto, getValorRecebido } from '../hooks/useContasReceberMutations';
import { fmt, filterContas, getBaixasConta, FinanceStatusBadge, formatDateTimeLabel } from './ContasReceberUtils';
import { ContaActions } from './ContaActions';
import { BaixaHistorico } from './BaixaHistorico';

export type ContasListProps = {
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

export function ContasList({
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

  const isMobile = useIsMobile(1080);

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
          render: (conta) => {
            const recebido = getValorRecebido(conta);
            const total = conta.valor;
            const percent = total > 0 ? Math.min(100, Math.round((recebido / total) * 100)) : 0;
            return (
              <div className="flex flex-col items-end gap-1.5">
                <span className="table-cell-strong tone-success">{fmt(recebido)}</span>
                <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden" title={`${percent}% Recebido`}>
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          },
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
              {conta.vencimento.split('-').reverse().join('/')}
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
