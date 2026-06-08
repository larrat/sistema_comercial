import type { ContaReceber, ContaReceberBaixa } from '../../../../types/domain';
import { StatCard } from '../../../shared/ui';
import { getStatusEfetivo, getValorEmAberto } from '../hooks/useContasReceberMutations';
import { hoje, fmt } from './ContasReceberUtils';

export function ContasReceberMetrics({
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
