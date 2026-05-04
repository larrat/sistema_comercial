import type { Produto } from '../../../../types/domain';
import { StatCard } from '../../../shared/ui';

type Props = {
  produtos: Produto[];
};

export function ProdutoMetrics({ produtos }: Props) {
  const comPrecificacao = produtos.filter((p) => (p.mkv ?? 0) > 0).length;
  const categorias = new Set(produtos.map((p) => p.cat).filter(Boolean)).size;

  return (
    <section className="rf-ui-stat-grid--3 rf-produtos-metrics">
      <StatCard label="Produtos" value={produtos.length} />
      <StatCard label="Categorias" value={categorias} />
      <StatCard label="Com precificação" value={comPrecificacao} />
    </section>
  );
}
