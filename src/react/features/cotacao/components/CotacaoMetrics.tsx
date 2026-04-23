import { StatCard } from '../../../shared/ui';
import type { Fornecedor, PrecosMap } from '../types';
import type { Produto } from '../../../../types/domain';

type Props = {
  produtos: Produto[];
  fornecedores: Fornecedor[];
  precos: PrecosMap;
};

export function CotacaoMetrics({ produtos, fornecedores, precos }: Props) {
  const total = produtos.length * fornecedores.length;
  const filled = produtos.reduce(
    (acc, p) =>
      acc +
      fornecedores.filter((f) => {
        const v = precos[p.id]?.[f.id];
        return v !== undefined && v > 0;
      }).length,
    0
  );
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  const fornTotals = fornecedores.map((f) => {
    const t = produtos.reduce((acc, p) => acc + (precos[p.id]?.[f.id] || 0), 0);
    return { forn: f, total: t };
  });
  const melhor = fornTotals
    .filter((ft) => ft.total > 0)
    .sort((a, b) => a.total - b.total)[0]?.forn;

  return (
    <div className="rf-ui-metrics-band">
      <StatCard label="Produtos" value={String(produtos.length)} />
      <StatCard label="Fornecedores" value={String(fornecedores.length)} />
      <StatCard label="Preenchimento" value={`${pct}%`} />
      <StatCard label="Melhor fornecedor" value={melhor?.nome ?? '—'} />
    </div>
  );
}
