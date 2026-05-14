import { useState, useMemo } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  Package, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Truck,
  ArrowRight
} from 'lucide-react';
import { 
  PageHeader, 
  Button, 
  DataTable, 
  StatusBadge, 
  LoadingState, 
  ErrorState,
  Badge,
  Shimmer
} from '../../../shared/ui';
import { PedidoCompraForm } from './PedidoCompraForm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listPedidosCompra, finalizarPedidoCompra, savePedidoCompra } from '../services/comprasApi';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (v: number) => BRL.format(v || 0);

export function ComprasPilotPage() {
  const { token } = useAuthStore();
  const { activeFilialId } = useFilialStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: pedidos = [], isLoading, isError } = useQuery({
    queryKey: ['pedidos-compra', activeFilialId],
    queryFn: () => listPedidosCompra(token!, activeFilialId!),
    enabled: !!token && !!activeFilialId
  });

  const finalizarMutation = useMutation({
    mutationFn: (p: any) => finalizarPedidoCompra(token!, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-compra'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] }); // Refresh stock
    }
  });

  const saveMutation = useMutation({
    mutationFn: ({ pedido, itens }: any) => savePedidoCompra(token!, pedido, itens),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-compra'] });
      setIsFormOpen(false);
    }
  });

  const filtered = useMemo(() => {
    return pedidos.filter(p => 
      p.fornecedor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pedidos, searchTerm]);

  if (isLoading) return <LoadingState description="Carregando pedidos de compra..." />;
  if (isError) return <ErrorState title="Erro ao carregar compras" />;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <PageHeader
        kicker="Suprimentos"
        title="Pedidos de Compra"
        description="Gerencie ordens de compra e entrada de mercadorias no estoque."
        actions={
          <button 
            onClick={() => setIsFormOpen(true)}
            className="rf-btn-premium rf-btn-premium--primary rf-glow-cyan !py-2.5 !px-5 !rounded-xl"
          >
            <Plus size={18} />
            <span>Novo Pedido</span>
          </button>
        }
      />

      {isFormOpen && (
        <PedidoCompraForm 
          filialId={activeFilialId!}
          onClose={() => setIsFormOpen(false)}
          onSave={(pedido, itens) => saveMutation.mutate({ pedido, itens })}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rf-card-premium border-white/5 bg-surface-card/40 backdrop-blur-xl p-5">
           <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500"><ShoppingBag size={16} /></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Aberto</span>
           </div>
           <h3 className="text-2xl font-black text-white">
             {pedidos.filter(p => p.status === 'aberto').length}
           </h3>
        </div>
        <div className="rf-card-premium border-white/5 bg-surface-card/40 backdrop-blur-xl p-5">
           <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><Truck size={16} /></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recebidos</span>
           </div>
           <h3 className="text-2xl font-black text-white">
             {pedidos.filter(p => p.status === 'finalizado').length}
           </h3>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="produtos-filter-bar flex items-center gap-4">
        <div className="flex-1 relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-cyan-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Buscar por fornecedor ou ID do pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-11 pr-4 py-2.5 bg-black/20 border border-white/5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rf-card-premium p-0 border-white/5 bg-surface-card/40 backdrop-blur-xl overflow-hidden">
        <DataTable
          data={filtered}
          columns={[
            {
              key: 'id',
              label: 'Pedido',
              render: (p) => (
                <div className="flex flex-col">
                  <span className="text-xs font-black text-white uppercase tracking-tighter">{p.id}</span>
                  <span className="text-[10px] text-slate-500">{new Date(p.criado_em).toLocaleDateString()}</span>
                </div>
              )
            },
            {
              key: 'fornecedor',
              label: 'Fornecedor',
              render: (p) => <span className="text-sm font-bold text-slate-200">{p.fornecedor_nome}</span>
            },
            {
              key: 'itens',
              label: 'Itens',
              render: (p) => (
                <Badge variant="slate" className="!bg-white/5 !text-slate-400">
                  {p.pedido_compra_itens?.length || 0} itens
                </Badge>
              )
            },
            {
              key: 'total',
              label: 'Total',
              render: (p) => <span className="text-sm font-black text-white">{fmt(p.total)}</span>
            },
            {
              key: 'status',
              label: 'Status',
              render: (p) => (
                <StatusBadge tone={p.status === 'finalizado' ? 'success' : p.status === 'aberto' ? 'warning' : 'neutral'}>
                  {p.status.toUpperCase()}
                </StatusBadge>
              )
            },
            {
              key: 'actions',
              label: '',
              render: (p) => (
                <div className="flex justify-end">
                   {p.status === 'aberto' ? (
                     <Button 
                       size="sm" 
                       variant="primary" 
                       className="!rounded-lg !text-[10px]"
                       onClick={() => finalizarMutation.mutate(p)}
                       loading={finalizarMutation.isPending}
                     >
                       Dar Entrada
                     </Button>
                   ) : (
                     <Button size="sm" variant="secondary" className="!rounded-lg !text-[10px]">Ver Detalhes</Button>
                   )}
                </div>
              )
            }
          ]}
        />
      </div>
    </div>
  );
}
