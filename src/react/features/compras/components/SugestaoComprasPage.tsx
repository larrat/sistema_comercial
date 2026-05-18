import React, { useMemo, useState } from 'react';
import { 
  PageHeader, 
  DataTable, 
  PillGroup, 
  Badge, 
  Button, 
  Shimmer, 
  EmptyState,
  StatCard
} from '../../../shared/ui';
import { Package, ShoppingCart, TrendingDown, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';

type SugestaoCompra = {
  produto_id: string;
  produto_nome: string;
  sku: string;
  estoque_atual: number;
  estoque_minimo: number;
  consumo_diario_medio: number;
  dias_cobertura: number;
  status_reposicao: 'urgente' | 'atencao' | 'ok';
  qtd_sugerida: number;
};

export function SugestaoComprasPage() {
  const { token } = useApiContext();
  const { activeFilialId } = useFilialStore();
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'urgente' | 'atencao'>('todos');

  const { data: sugestoes = [], isLoading } = useQuery({
    queryKey: ['sugestao-compras', activeFilialId],
    queryFn: async () => {
      if (!token) return [];
      const { url, key } = getSupabaseConfig();
      const res = await fetch(`${url}/rest/v1/v_sugestao_compras?order=dias_cobertura.asc`, {
        headers: { apikey: key, Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar sugestões de compra');
      return (await res.json()) as SugestaoCompra[];
    },
    enabled: !!token
  });

  const filteredData = useMemo(() => {
    if (filtroStatus === 'todos') return sugestoes;
    return sugestoes.filter(s => s.status_reposicao === filtroStatus);
  }, [sugestoes, filtroStatus]);

  const stats = useMemo(() => ({
    urgentes: sugestoes.filter(s => s.status_reposicao === 'urgente').length,
    atencao: sugestoes.filter(s => s.status_reposicao === 'atencao').length,
    coberturaMedia: sugestoes.length > 0 
      ? (sugestoes.reduce((acc, s) => acc + s.dias_cobertura, 0) / sugestoes.length).toFixed(0)
      : 0
  }), [sugestoes]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Stock AI: Sugestões de Compra" description="Calculando inteligência de reposição..." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Shimmer height={120} rounded="2xl" />
          <Shimmer height={120} rounded="2xl" />
          <Shimmer height={120} rounded="2xl" />
        </div>
        <Shimmer height={400} rounded="2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="Inteligência de Estoque"
        title="Stock AI: Sugestões"
        description="Análise automática de giro e previsão de ruptura baseada nos últimos 90 dias."
        actions={
          <Button variant="primary" leftIcon={<ShoppingCart className="w-4 h-4" />}>
            Gerar Pedido em Massa
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Reposição Urgente" 
          value={stats.urgentes} 
          tone={stats.urgentes > 0 ? 'negative' : 'positive'}
          icon={<AlertCircle className="w-5 h-5" />}
        />
        <StatCard 
          label="Em Atenção" 
          value={stats.atencao} 
          tone="warning"
          icon={<TrendingDown className="w-5 h-5" />}
        />
        <StatCard 
          label="Cobertura Média" 
          value={`${stats.coberturaMedia} dias`} 
          icon={<Package className="w-5 h-5" />}
        />
      </div>

      <div className="rf-card-premium p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <PillGroup
            options={[
              { id: 'todos', label: 'Todos os Itens' },
              { id: 'urgente', label: 'Críticos (Urgente)' },
              { id: 'atencao', label: 'Atenção' }
            ]}
            activeId={filtroStatus}
            onChange={(id) => setFiltroStatus(id as any)}
          />
        </div>

        <DataTable
          data={filteredData}
          columns={[
            {
              header: 'Produto',
              cell: (row) => (
                <div className="flex flex-col">
                  <span className="font-bold text-white">{row.produto_nome}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{row.sku}</span>
                </div>
              )
            },
            {
              header: 'Status',
              cell: (row) => (
                <Badge variant={
                  row.status_reposicao === 'urgente' ? 'red' : 
                  row.status_reposicao === 'atencao' ? 'yellow' : 'green'
                }>
                  {row.status_reposicao.toUpperCase()}
                </Badge>
              )
            },
            {
              header: 'Estoque Atual',
              cell: (row) => `${row.estoque_atual.toFixed(0)} un`
            },
            {
              header: 'Consumo Médio',
              cell: (row) => `${row.consumo_diario_medio.toFixed(2)} / dia`
            },
            {
              header: 'Cobertura',
              cell: (row) => (
                <div className="flex flex-col">
                  <span className={row.dias_cobertura <= 7 ? 'text-rose-400 font-bold' : 'text-white'}>
                    {row.dias_cobertura.toFixed(0)} dias
                  </span>
                </div>
              )
            },
            {
              header: 'Sugerido',
              cell: (row) => (
                <span className="text-emerald-400 font-black">
                  +{row.qtd_sugerida.toFixed(0)}
                </span>
              )
            },
            {
              header: 'Ações',
              cell: () => (
                <Button size="sm" variant="secondary">Comprar</Button>
              )
            }
          ]}
        />
      </div>

      {filteredData.length === 0 && (
        <EmptyState 
          title="Estoque Saudável" 
          description="Nenhum produto atingiu o nível de reposição crítico no momento."
        />
      )}
    </div>
  );
}
