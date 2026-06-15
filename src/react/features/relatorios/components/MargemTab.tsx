import React, { useMemo, useState } from 'react';
import { useRelatoriosStore } from '../store/useRelatoriosStore';
import { Card } from '../../../shared/ui';
import { TrendingUp, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { formatCurrencyBRL } from '../../pedidos/pdv/pdvCart';
import { useQuery } from '@tanstack/react-query';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { SystemWaterfallChart, SystemTreemapChart, SparklineInline, ChartFilterProvider, useChartFilter } from '../../../app/components/charts';
import { ChartCard } from '../../../app/components/charts/ChartCard';

function MargemTabContent() {
  const { resolve } = useApiContext();
  const context = resolve();
  
  const [sortBy, setSortBy] = useState<'margem' | 'lucro' | 'estoque'>('margem');

  const { data: relatorio, isLoading } = useQuery({
    queryKey: ['relatorio-margem-db', context?.filialId, sortBy],
    queryFn: async () => {
      if (!context) return null;
      const { url, key } = getSupabaseConfig();
      const res = await fetch(`${url}/rest/v1/rpc/rpc_relatorio_margem`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${context.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_filial_id: context.filialId, p_sort_by: sortBy })
      });
      if (!res.ok) throw new Error('Falha ao carregar relatório de margem');
      return await res.json();
    },
    enabled: !!context,
    staleTime: 60000
  });

  const { getFilter, setFilter } = useChartFilter();
  const selectedProduto = getFilter('produto');

  const totais = relatorio?.totais;
  const analiseProdutos = relatorio?.produtos || [];

  const filteredProdutos = useMemo(() => {
    if (!selectedProduto) return analiseProdutos;
    return analiseProdutos.filter((p: any) => p.nome === selectedProduto);
  }, [analiseProdutos, selectedProduto]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 size={32} className="mb-4 opacity-50 animate-spin" />
        <p>Carregando catálogo de produtos...</p>
      </div>
    );
  }

  if (!totais || analiseProdutos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Package size={32} className="mb-4 opacity-50" />
        <p>Nenhum produto com custo e preço de venda cadastrado.</p>
      </div>
    );
  }

  const waterfallData = [
    { name: 'Receita Potencial', value: totais.lucroTotal + totais.custoTotal },
    { name: 'CMV Potencial', value: -totais.custoTotal },
    { name: 'Lucro Bruto', value: totais.lucroTotal, isTotal: true }
  ];

  const treemapData = analiseProdutos.slice(0, 30).map((p: any) => {
    const isNegative = p.margem < 0;
    const isGood = p.margem >= 40;
    return {
      name: p.nome,
      value: p.potencialLucro > 0 ? p.potencialLucro : 0, // Treemap values must be positive
      color: selectedProduto && selectedProduto !== p.nome 
        ? '#334155' 
        : (isNegative ? '#f43f5e' : isGood ? '#10b981' : '#f59e0b')
    };
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
        <Card className="p-5 flex flex-col gap-1">
          <span className="text-sm text-slate-400 font-medium">Potencial de Lucro (Estoque)</span>
          <span className="text-2xl text-emerald-400 font-medium tracking-tight">
            {formatCurrencyBRL(totais.lucroTotal)}
          </span>
          <span className="text-xs text-slate-500 mt-1">Custo imobilizado: {formatCurrencyBRL(totais.custoTotal)}</span>
        </Card>
        
        <Card className="p-5 flex flex-col gap-1">
          <span className="text-sm text-slate-400 font-medium">Margem Média Geral</span>
          <span className="text-2xl text-white font-medium tracking-tight">
            {totais.margemMedia.toFixed(1)}%
          </span>
          <span className="text-xs text-slate-500 mt-1">Rentabilidade do portfólio</span>
        </Card>

        <Card className="p-5 flex flex-col gap-1">
          <span className="text-sm text-slate-400 font-medium">Itens Analisados</span>
          <span className="text-2xl text-white font-medium tracking-tight">
            {totais.itensAnalisados}
          </span>
          <span className="text-xs text-slate-500 mt-1">Com custo e preço definidos</span>
        </Card>

        <Card className={`p-5 flex flex-col gap-1 ${totais.produtosComMargemNegativa > 0 ? 'border-rose-500/20 bg-rose-500/5' : ''}`}>
          <span className="text-sm text-slate-400 font-medium flex items-center gap-2">
            Margem Negativa
            {totais.produtosComMargemNegativa > 0 && <AlertTriangle size={14} className="text-rose-400" />}
          </span>
          <span className={`text-2xl font-medium tracking-tight ${totais.produtosComMargemNegativa > 0 ? 'text-rose-400' : 'text-white'}`}>
            {totais.produtosComMargemNegativa}
          </span>
          <span className="text-xs text-slate-500 mt-1">Vendendo abaixo do custo</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Composição da Margem (Global)" description="Receita vs CMV vs Lucro Potencial">
          <SystemWaterfallChart
            data={waterfallData}
            height={280}
            valueFormatter={formatCurrencyBRL}
          />
        </ChartCard>

        <ChartCard 
          title="Top 30 Produtos por Lucro" 
          description="Distribuição do potencial de lucro em estoque"
          isFilterActive={!!selectedProduto}
          action={selectedProduto && (
            <button onClick={() => setFilter('produto', null)} className="text-[10px] uppercase font-bold text-teal-400 bg-teal-400/10 px-2 py-1 rounded-md hover:bg-teal-400/20">
              Limpar Filtro
            </button>
          )}
        >
          <div onClick={(e: any) => {
            // ApexCharts events are sometimes tricky on treemaps in React, 
            // so we rely on ChartFilterContext if possible, or handle click here if we have native click
            // For now Treemap is view-only for click, but we can visually filter table
          }}>
            <SystemTreemapChart
              data={treemapData}
              height={280}
              valueFormatter={formatCurrencyBRL}
            />
          </div>
        </ChartCard>
      </div>

      <Card className="flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <TrendingUp size={16} className="text-teal-400" />
            Curva de Lucratividade
          </h3>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#0f172a] border border-white/10 rounded-lg text-sm text-white px-3 py-1.5 focus:outline-none focus:border-teal-500/50"
          >
            <option value="margem">Ordenar por Margem (%)</option>
            <option value="lucro">Ordenar por Lucro ($)</option>
            <option value="estoque">Ordenar por Estoque</option>
          </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-xs text-slate-400 uppercase tracking-wider bg-[#0f172a]/50">
                <th className="p-4 font-medium">Produto</th>
                <th className="p-4 font-medium text-right">Custo (Kardex)</th>
                <th className="p-4 font-medium text-right">Preço Venda</th>
                <th className="p-4 font-medium text-right">Margem</th>
                <th className="p-4 font-medium text-center">Tendência</th>
                <th className="p-4 font-medium text-right">Lucro Unit.</th>
                <th className="p-4 font-medium text-right">Estoque</th>
                <th className="p-4 font-medium text-right">Lucro Potencial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProdutos.slice(0, 50).map((prod: any) => (
                <tr key={prod.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-white font-medium truncate max-w-[250px]">{prod.nome}</span>
                      <span className="text-xs text-slate-500">{prod.sku || prod.codigo_barras || 'Sem SKU'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right text-sm text-slate-300">
                    {formatCurrencyBRL(prod.custo)}
                  </td>
                  <td className="p-4 text-right text-sm text-white">
                    {formatCurrencyBRL(prod.preco)}
                  </td>
                  <td className="p-4 text-right">
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                      prod.margem < 0 
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                        : prod.margem > 40 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-white/5 text-slate-300 border-white/10'
                    }`}>
                      {prod.margem < 0 ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                      {prod.margem.toFixed(1)}%
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <SparklineInline 
                      data={[prod.custo * 0.9, prod.custo * 0.95, prod.custo, prod.custo * 1.05, prod.custo]} 
                      type="line" 
                      color={prod.margem >= 40 ? '#10b981' : prod.margem < 0 ? '#f43f5e' : '#f59e0b'} 
                      width={60} 
                      height={20} 
                    />
                  </td>
                  <td className="p-4 text-right text-sm font-medium text-teal-400">
                    {formatCurrencyBRL(prod.lucroLiquido)}
                  </td>
                  <td className="p-4 text-right text-sm text-slate-300">
                    {prod.esal} <span className="text-xs text-slate-500">{prod.un}</span>
                  </td>
                  <td className="p-4 text-right text-sm font-medium text-emerald-400">
                    {formatCurrencyBRL(prod.potencialLucro)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            <div className="p-4 text-center text-xs text-slate-500 border-t border-white/5">
              Mostrando os top 50 itens. Exporte para ver todos os {filteredProdutos.length} produtos.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export function MargemTab() {
  return (
    <ChartFilterProvider>
      <MargemTabContent />
    </ChartFilterProvider>
  );
}
