import { StatCard } from '../../../shared/ui';
import type { EstoqueMetrics as EstoqueMetricsType } from '../types';

type EstoqueMetricsProps = {
  metrics: EstoqueMetricsType;
};

function fmtCurrency(value: number) {
  return Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

export function EstoqueMetrics({ metrics }: EstoqueMetricsProps) {
  return (
    <section className="rf-ui-stat-grid">
      <StatCard label="Produtos" value={metrics.produtos} foot="Catálogo acompanhado" />
      <StatCard
        label="Valor em estoque"
        value={fmtCurrency(metrics.valorEmEstoque)}
        foot="Estimativa atual"
      />
      <StatCard label="Em alerta" value={metrics.emAlerta} tone="warning" foot="Abaixo do mínimo" />
      <StatCard label="Zerados" value={metrics.zerados} tone="danger" foot="Sem saldo disponível" />
    </section>
  );
}
