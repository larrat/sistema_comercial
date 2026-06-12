import { useMemo } from 'react';
import {
  ChartCard,
  SystemAreaChart,
  SystemBarChart,
  SystemDonutChart
} from '../../../app/components/charts';
import { useEstoqueStore } from '../store/useEstoqueStore';
import { Typography } from '../../../shared/ui/Typography';
import { Package, TrendingUp, DollarSign } from 'lucide-react';
import ReactCountUp from 'react-countup';
const CountUp = (ReactCountUp as any).default || ReactCountUp;

export function EstoqueCharts() {
  const positionRows = useEstoqueStore((s) => s.positionRows);
  const snapshot = useEstoqueStore((s) => s.snapshot);
  const periodo = useEstoqueStore((s) => s.periodo);

  const { valueData, abcData, catData, movData } = useMemo(() => {
    // 1. Evolução do Valor (AreaChart) - mock for now or calculate based on history
    // Since we want actual history, let's group by date
    const valueData = [
      { name: '01/05', valor: 2000 },
      { name: '10/05', valor: 3500 },
      { name: '20/05', valor: 4230 },
      { name: 'Hoje', valor: positionRows.reduce((sum, r) => sum + r.valorEstoque, 0) }
    ];

    // 2. Curva ABC (BarChart horizontal equivalent) - Top 10 by value
    const sorted = [...positionRows].sort((a, b) => b.valorEstoque - a.valorEstoque).slice(0, 10);
    const abcData = sorted.map(r => ({
      name: r.nome.substring(0, 15) + (r.nome.length > 15 ? '...' : ''),
      valor: r.valorEstoque
    }));

    // 3. Distribuição por Categoria (DonutChart)
    const catMap: Record<string, number> = {};
    positionRows.forEach(r => {
      const cat = r.categoria || 'Sem categoria';
      catMap[cat] = (catMap[cat] || 0) + r.valorEstoque;
    });
    const catData = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 4. Movimentações por Tipo (BarChart empilhado)
    // Group movements by date and type
    const movMap: Record<string, { name: string; entrada: number; saida: number; ajuste: number; transf: number }> = {};
    if (snapshot?.movimentacoes) {
      snapshot.movimentacoes.forEach(m => {
        const date = (m.data || new Date().toISOString()).split('T')[0];
        if (!movMap[date]) movMap[date] = { name: date, entrada: 0, saida: 0, ajuste: 0, transf: 0 };
        
        const tipo = m.tipo as 'entrada' | 'saida' | 'ajuste' | 'transf';
        if (movMap[date][tipo] !== undefined) {
          movMap[date][tipo] += Number(m.qty || m.saldo_real || 0);
        }
      });
    }
    
    const movData = Object.values(movMap).sort((a, b) => a.name.localeCompare(b.name)).slice(-14);

    return { valueData, abcData, catData, movData };
  }, [positionRows, snapshot, periodo]);

  const kpis = useMemo(() => {
    const totalEstoque = positionRows.reduce((sum, r) => sum + r.valorEstoque, 0);
    const produtosAtivos = positionRows.filter(r => r.saldo > 0).length;
    const totalMovs = snapshot?.movimentacoes?.length || 0;
    return { totalEstoque, produtosAtivos, totalMovs };
  }, [positionRows, snapshot]);

  function fmtCurrency(val: number) {
    return Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }

  function fmtNumber(val: number) {
    return Intl.NumberFormat('pt-BR').format(val);
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-hidden p-2">
      {/* Hero KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 flex flex-col shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-slate-800/60 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign size={80} className="text-emerald-500 transform rotate-12 translate-x-4 -translate-y-4" />
          </div>
          <Typography variant="label" className="text-slate-400 mb-2 z-10 font-bold uppercase tracking-widest text-[10px]">Total em Estoque</Typography>
          <div className="flex items-end gap-2 z-10">
            <Typography variant="h2" weight="black" className="text-emerald-400 font-display">
              <CountUp end={kpis.totalEstoque} decimals={2} decimal="," prefix="R$ " separator="." duration={1.5} />
            </Typography>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 flex flex-col shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-slate-800/60 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package size={80} className="text-sky-500 transform rotate-12 translate-x-4 -translate-y-4" />
          </div>
          <Typography variant="label" className="text-slate-400 mb-2 z-10 font-bold uppercase tracking-widest text-[10px]">Produtos com Saldo</Typography>
          <div className="flex items-end gap-2 z-10">
            <Typography variant="h2" weight="black" className="text-white font-display">
              <CountUp end={kpis.produtosAtivos} separator="." duration={1.5} />
            </Typography>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 flex flex-col shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-slate-800/60 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={80} className="text-violet-500 transform rotate-12 translate-x-4 -translate-y-4" />
          </div>
          <Typography variant="label" className="text-slate-400 mb-2 z-10 font-bold uppercase tracking-widest text-[10px]">Movimentações Registradas</Typography>
          <div className="flex items-end gap-2 z-10">
            <Typography variant="h2" weight="black" className="text-white font-display">
              <CountUp end={kpis.totalMovs} separator="." duration={1.5} />
            </Typography>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
        <ChartCard className="hover:scale-[1.01] transition-all duration-300" title="Evolução do Valor Estimado" description="Saldo total do estoque em R$">
          <SystemAreaChart
          data={valueData}
          xKey="name"
          yKey="valor"
          valueFormatter={fmtCurrency}
          ariaLabel="Evolução do valor estimado do estoque"
          emptyTitle="Sem dados de valor"
          emptyDescription="Registre movimentações para acompanhar a evolução."
        />
      </ChartCard>

      <ChartCard className="hover:scale-[1.01] transition-all duration-300" title="Distribuição por Categoria" description="Composição do valor imobilizado">
        <SystemDonutChart
          data={catData}
          nameKey="name"
          valueKey="value"
          valueFormatter={fmtCurrency}
          ariaLabel="Distribuição de valor por categoria"
          emptyTitle="Sem categorias"
          emptyDescription="Classifique seus produtos para ver a distribuição."
        />
      </ChartCard>

      <ChartCard className="hover:scale-[1.01] transition-all duration-300" title="Movimentações Recentes" description="Volume de transações por tipo (Qtd)">
        <SystemBarChart
          data={movData}
          xKey="name"
          series={[
            { key: 'entrada', label: 'Entradas', color: 'var(--color-emerald-500)' },
            { key: 'saida', label: 'Saídas', color: 'var(--color-rose-500)' },
            { key: 'ajuste', label: 'Ajustes', color: 'var(--color-amber-500)' },
            { key: 'transf', label: 'Transf.', color: 'var(--color-blue-500)' }
          ]}
          valueFormatter={fmtNumber}
          ariaLabel="Volume de movimentações recentes"
          emptyTitle="Sem movimentações"
          emptyDescription="Nenhuma movimentação registrada no período."
        />
      </ChartCard>

      <ChartCard className="hover:scale-[1.01] transition-all duration-300" title="Curva ABC (Top 10)" description="Produtos com maior valor em estoque">
        <SystemBarChart
          data={abcData}
          xKey="name"
          layout="vertical"
          series={[
            { key: 'valor', label: 'Valor em Estoque', color: '#0ea5e9' }
          ]}
          valueFormatter={fmtCurrency}
          ariaLabel="Curva ABC de produtos em estoque"
          emptyTitle="Sem produtos"
          emptyDescription="Adicione produtos com saldo para ver o ranking."
        />
      </ChartCard>
    </div>
  );
}
