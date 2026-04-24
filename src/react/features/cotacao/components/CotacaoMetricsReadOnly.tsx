import { StatCard } from '../../../shared/ui';
import { useCotacaoStore } from '../store/useCotacaoStore';

export function CotacaoMetricsReadOnly() {
  const metrics = useCotacaoStore((s) => s.metrics);

  return (
    <section className="rf-ui-stat-grid">
      <StatCard label="Produtos" value={metrics.produtos} />
      <StatCard label="Fornecedores" value={metrics.fornecedores} />
      <StatCard label="Preenchimento" value={`${metrics.preenchimento}%`} />
      <StatCard label="Melhor fornecedor" value={metrics.melhorFornecedor || '—'} />
    </section>
  );
}
