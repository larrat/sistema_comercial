import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Calendar,
  Wallet,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  PageHeader, 
  Button, 
  Card, 
  StatusBadge, 
  DataTable, 
  LoadingState, 
  ErrorState,
  Shimmer,
  PillGroup
} from '../../../shared/ui';
import { CaixaTransacaoForm } from './CaixaTransacaoForm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { SalesReceipt } from '../../../shared/services/DocumentService';
import { listTransacoes, listCategorias, addTransacao, getSaldo } from '../services/caixaApi';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { useFilialStore } from '../../../app/useFilialStore';


const fmt = (v: number) => fmtBRL(v || 0);

export function CaixaPilotPage() {
  const { token } = useApiContext();
  const { activeFilialId } = useFilialStore();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: transacoes = [], isLoading, isError } = useQuery({
    queryKey: ['caixa-transacoes', activeFilialId],
    queryFn: () => listTransacoes(token!, activeFilialId!),
    enabled: !!token && !!activeFilialId
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['caixa-categorias'],
    queryFn: () => listCategorias(token!),
    enabled: !!token
  });

  const addMutation = useMutation({
    mutationFn: (t: any) => addTransacao(token!, t),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-transacoes'] });
      setIsFormOpen(false);
    }
  });

  const saldo = useMemo(() => {
    return transacoes.reduce((acc, t) => t.tipo === 'entrada' ? acc + t.valor : acc - t.valor, 0);
  }, [transacoes]);

  const stats = useMemo(() => {
    const entradas = transacoes.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + t.valor, 0);
    const saidas = transacoes.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + t.valor, 0);
    return { entradas, saidas };
  }, [transacoes]);

  const filtered = useMemo(() => {
    if (filterType === 'todos') return transacoes;
    return transacoes.filter(t => t.tipo === filterType);
  }, [transacoes, filterType]);

  if (isLoading) return <LoadingState description="Carregando fluxo de caixa..." />;
  if (isError) return <ErrorState title="Erro ao carregar caixa" />;

  return (
    <main className="flex-1 w-full flex flex-col gap-8 animate-in fade-in duration-500">
      <PageHeader
        kicker="Financeiro"
        title="Fluxo de Caixa"
        description="Monitore entradas, saídas e saldo operacional em tempo real."
        actions={
          <div className="flex items-center gap-3">
             <Link to="/app/caixa/conciliacao">
               <Button variant="secondary" leftIcon={<RefreshCw size={16} />}>
                 Conciliação
               </Button>
             </Link>
             <PDFDownloadLink 
               document={<SalesReceipt pedido={{ total: saldo, itens: transacoes.map(t => ({ nome: t.descricao, qty: 1, preco: t.valor })), num: 'CX-RESUMO', data: new Date().toISOString() }} filialNome="Nexus Industrial" />} 
               fileName={`caixa_${new Date().toISOString().split('T')[0]}.pdf`}
             >
               {({ loading }) => (
                 <Button variant="secondary" leftIcon={<Filter size={16} />} loading={loading}>
                   Exportar PDF
                 </Button>
               )}
             </PDFDownloadLink>
             <Button 
               variant="primary" 
               leftIcon={<Plus size={16} />}
               onClick={() => setIsFormOpen(true)}
             >
               Lançamento Manual
             </Button>
          </div>
        }
      />

      {isFormOpen && (
        <CaixaTransacaoForm 
          categories={categories}
          filialId={activeFilialId!}
          onClose={() => setIsFormOpen(false)}
          onSave={(t) => addMutation.mutate(t)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden border-white/5 bg-surface-card/40 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-white/10 hover:shadow-teal-500/5 active:scale-[0.99]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo Atual</span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-500">
              <Wallet size={20} />
            </div>
          </div>
          <h2 className={`text-3xl font-black ${saldo >= 0 ? 'text-white' : 'text-rose-500'}`}>
            {fmt(saldo)}
          </h2>
          <div className="mt-4 flex items-center gap-2">
             <StatusBadge tone={saldo >= 0 ? 'success' : 'danger'}>
               {saldo >= 0 ? 'Positivo' : 'Negativo'}
             </StatusBadge>
          </div>
        </Card>

        <Card className="border-white/5 bg-surface-card/40 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-white/10 hover:shadow-emerald-500/5 active:scale-[0.99]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Entradas (Total)</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <TrendingUp size={20} />
            </div>
          </div>
          <h2 className="text-3xl font-black text-emerald-400">
            {fmt(stats.entradas)}
          </h2>
          <p className="mt-2 text-[11px] text-slate-500 font-medium">Vendas e recebimentos</p>
        </Card>

        <Card className="border-white/5 bg-surface-card/40 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-white/10 hover:shadow-rose-500/5 active:scale-[0.99]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saídas (Total)</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
              <TrendingDown size={20} />
            </div>
          </div>
          <h2 className="text-3xl font-black text-rose-400">
            {fmt(stats.saidas)}
          </h2>
          <p className="mt-2 text-[11px] text-slate-500 font-medium">Compras e despesas</p>
        </Card>
      </div>

      {/* Transactions Table */}
      <div className="rf-card-premium p-0 border-white/5 bg-surface-card/40 backdrop-blur-xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Últimas Movimentações</h3>
          <div className="flex items-center bg-black/20 p-1 rounded-xl border border-white/5">
            <PillGroup
              options={[
                { id: 'todos', label: 'Todos' },
                { id: 'entrada', label: 'Entradas' },
                { id: 'saida', label: 'Saídas' }
              ]}
              activeId={filterType}
              onChange={(id) => setFilterType(id as any)}
            />
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={[
            {
              key: 'data',
              label: 'Data',
              render: (t) => (
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${t.tipo === 'entrada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {t.tipo === 'entrada' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  </div>
                  <span className="text-xs font-bold text-slate-300">
                    {new Date(t.criado_em!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            },
            {
              key: 'descricao',
              label: 'Descrição',
              render: (t) => (
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">{t.descricao}</span>
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{t.caixa_categorias?.nome}</span>
                </div>
              )
            },
            {
              key: 'valor',
              label: 'Valor',
              render: (t) => (
                <span className={`text-sm font-black ${t.tipo === 'entrada' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {t.tipo === 'entrada' ? '+' : '-'} {fmt(t.valor)}
                </span>
              )
            },
            {
              key: 'status',
              label: 'Origem',
              render: (t) => (
                <StatusBadge tone="neutral">
                  {t.entidade_tipo ? t.entidade_tipo.toUpperCase() : 'MANUAL'}
                </StatusBadge>
              )
            }
          ]}
        />
      </div>
    </main>
  );
}
