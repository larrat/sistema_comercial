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
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  Badge,
  Shimmer,
  FilterBar,
  PageHeader,
  Button,
  DataTable,
  StatusBadge,
  LoadingState,
  ErrorState
} from '../../../shared/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listPedidosCompra, finalizarPedidoCompra } from '../services/comprasApi';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { useFilialStore } from '../../../app/useFilialStore';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (v: number) => BRL.format(v || 0);

export function ComprasPilotPage() {
  const { token } = useApiContext();
  const { filialId } = useFilialStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: pedidos = [], isLoading, isError } = useQuery({
    queryKey: ['pedidos-compra', filialId],
    queryFn: () => listPedidosCompra(token!, filialId!),
    enabled: !!token && !!filialId
  });

  const finalizarMutation = useMutation({
    mutationFn: (p: any) => finalizarPedidoCompra(token!, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-compra'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] }); // Refresh stock
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
    <main className="flex-1 w-full flex flex-col gap-8 animate-in fade-in duration-500">
      <PageHeader
        kicker="Suprimentos"
        title="Pedidos de Compra"
        description="Gerencie ordens de compra e entrada de mercadorias no estoque."
        actions={
          <div className="flex gap-3">
            <Link to="/app/compras/sugestoes">
              <Button variant="secondary" className="!rounded-xl" leftIcon={<Sparkles className="w-4 h-4 text-cyan-400" />}>
                Stock AI
              </Button>
            </Link>
            <Link to="/app/compras/novo">
              <Button variant="primary" className="!rounded-xl" leftIcon={<Plus className="w-4 h-4" />}>
                Novo pedido
              </Button>
            </Link>
          </div>
        }
      />

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
      <FilterBar 
        search={{
          value: searchTerm,
          onChange: (v) => setSearchTerm(v),
          placeholder: "Buscar por fornecedor ou ID do pedido..."
        }}
      />

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
                  <span className="text-[10px] text-slate-500">{new Intl.DateTimeFormat('pt-BR').format(new Date(p.criado_em))}</span>
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
    </main>
  );
}
