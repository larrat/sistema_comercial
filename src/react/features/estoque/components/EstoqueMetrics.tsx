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

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Tendency } from '../types';

export function EstoqueMetrics({ metrics }: EstoqueMetricsProps) {
  const renderTendency = (tendency: Tendency, value?: string) => {
    if (!tendency) return null;
    if (tendency === 'up') return <span className="text-emerald-400 font-bold flex items-center gap-1"><TrendingUp size={12} /> {value}</span>;
    if (tendency === 'down') return <span className="text-rose-400 font-bold flex items-center gap-1"><TrendingDown size={12} /> {value}</span>;
    return <span className="text-slate-400 font-bold flex items-center gap-1"><Minus size={12} /> {value}</span>;
  };

  return (
    <section className="rf-ui-stat-grid--5">
      <StatCard label="Produtos" value={metrics.produtos} foot="Catálogo acompanhado" />
      <StatCard
        label="Valor em estoque"
        value={fmtCurrency(metrics.valorEmEstoque)}
        foot={
          <div className="flex items-center justify-between w-full">
            <span>Estimativa atual</span>
            {renderTendency(metrics.valorEmEstoqueTendency)}
          </div>
        }
      />
      <StatCard label="Em alerta" value={metrics.emAlerta} tone="warning" foot="Abaixo do mínimo" />
      <StatCard label="Zerados" value={metrics.zerados} tone="danger" foot="Sem saldo disponível" />
      <StatCard
        label="Giro Médio"
        value={`${metrics.giroMedio.toFixed(1)}x`}
        foot={
          <div className="flex items-center justify-between w-full">
            <span>No período</span>
            {renderTendency(metrics.giroMedioTendency)}
          </div>
        }
      />
    </section>
  );
}
