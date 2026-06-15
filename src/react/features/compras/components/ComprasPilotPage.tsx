import { fmtBRL } from '../../../shared/lib/formatters';
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
  Sparkles,
  Calendar,
  DollarSign,
  Clipboard
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
  ErrorState,
  Modal,
  ConfirmModal
} from '../../../shared/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listPedidosCompra, finalizarPedidoCompra, cancelarPedidoCompra } from '../services/comprasApi';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { useFilialStore } from '../../../app/useFilialStore';
import { toast } from 'sonner';


const fmt = (v: number) => fmtBRL(v || 0);

type ComprasPilotPageProps = {
  hideHeader?: boolean;
};

export function ComprasPilotPage({ hideHeader = false }: ComprasPilotPageProps) {
  const { token } = useApiContext();
  const { filialId } = useFilialStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPedido, setSelectedPedido] = useState<any | null>(null);
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState<string | null>(null);

  const { data: pedidos = [], isLoading, isError } = useQuery({
    queryKey: ['pedidos-compra', filialId],
    queryFn: () => listPedidosCompra(token!, filialId!),
    enabled: !!token && !!filialId
  });

  const finalizarMutation = useMutation({
    mutationFn: async (p: any) => {
      // Finaliza a transação do pedido no banco de dados (RPC segura e atômica)
      await finalizarPedidoCompra(token!, p);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-compra'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] }); // Refresh stock
      queryClient.invalidateQueries({ queryKey: ['caixa-transacoes'] }); // Refresh cash balance
      toast.success('Pedido finalizado e entrada registrada no estoque!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao finalizar o pedido');
    }
  });

  const cancelarMutation = useMutation({
    mutationFn: async (pId: string) => {
      // Cancela o pedido no banco de dados (RPC segura e atômica)
      await cancelarPedidoCompra(token!, pId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-compra'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] }); // Refresh stock
      queryClient.invalidateQueries({ queryKey: ['caixa-transacoes'] }); // Refresh cash balance
      setPedidoParaCancelar(null);
      toast.success('Pedido de compra cancelado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao cancelar o pedido de compra.');
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
      {!hideHeader && (
        <PageHeader
          kicker="Suprimentos"
          title="Pedidos de Compra"
          description="Gerencie ordens de compra e entrada de mercadorias no estoque."
          actions={
          <div className="flex flex-wrap items-center justify-end gap-3 lg:gap-6 mt-4 lg:mt-0 w-full lg:w-auto">
              <Link to="/app/compras/sugestoes">
                <Button variant="secondary" className="!rounded-xl" leftIcon={<Sparkles className="w-4 h-4 text-teal-400" />}>
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
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rf-card-premium border-white/5 bg-surface-card/40 backdrop-blur-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:border-white/10 hover:shadow-teal-500/5 active:scale-[0.99]">
           <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-500"><ShoppingBag size={16} /></div>
              <span className="text-sm font-medium text-slate-400">Total Aberto</span>
           </div>
           <h3 className="text-2xl font-black text-white">
             {pedidos.filter(p => p.status === 'aberto').length}
           </h3>
        </div>
        <div className="rf-card-premium border-white/5 bg-surface-card/40 backdrop-blur-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:border-white/10 hover:shadow-emerald-500/5 active:scale-[0.99]">
           <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><Truck size={16} /></div>
              <span className="text-sm font-medium text-slate-400">Recebidos</span>
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
          placeholder: "Buscar por fornecedor ou ID do pedido…"
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
                  <span className="text-white text-sm font-medium text-slate-400">{p.id}</span>
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
                <div className="flex gap-2 justify-end">
                   <Button 
                     size="sm" 
                     variant="secondary" 
                     className="!rounded-lg !text-[10px]"
                     onClick={() => setSelectedPedido(p)}
                   >
                     Detalhes
                   </Button>
                   {p.status === 'aberto' && (
                     <Button 
                       size="sm" 
                       variant="primary" 
                       className="!rounded-lg !text-[10px]"
                       onClick={() => finalizarMutation.mutate(p)}
                       loading={finalizarMutation.isPending}
                     >
                       Dar Entrada
                     </Button>
                   )}
                   {p.status !== 'cancelado' && (
                     <Button 
                       size="sm" 
                       variant="secondary" 
                       className="!rounded-lg !text-[10px] hover:!bg-rose-500/10 hover:!text-rose-400 hover:!border-rose-500/20"
                       onClick={() => {
                         setPedidoParaCancelar(p.id);
                       }}
                       loading={cancelarMutation.isPending}
                     >
                       Cancelar
                     </Button>
                   )}
                </div>
              )
            }
          ]}
        />
      </div>

      {/* Modal de Detalhes do Pedido de Compra */}
      <Modal
        open={!!selectedPedido}
        onClose={() => setSelectedPedido(null)}
        title="Detalhes do Pedido de Compra"
        subtitle={selectedPedido ? `Código da ordem: ${selectedPedido.id}` : undefined}
        size="lg"
      >
        {selectedPedido && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecalho de Infos Gerais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                <span className="flex items-center gap-1 text-sm font-medium text-slate-400">Fornecedor</span>
                <span className="text-sm font-bold text-slate-200 truncate">{selectedPedido.fornecedor_nome}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                <span className="flex items-center gap-1 text-sm font-medium text-slate-400">Data de Emissão</span>
                <span className="text-sm font-bold text-slate-200">
                  {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(selectedPedido.criado_em))}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                <span className="flex items-center gap-1 text-sm font-medium text-slate-400">Forma de Pagamento</span>
                <span className="text-sm font-bold text-slate-200">{selectedPedido.forma_pagamento || 'Não informada'}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                <span className="flex items-center gap-1 text-sm font-medium text-slate-400">Status do Pedido</span>
                <div className="mt-1">
                  <StatusBadge tone={selectedPedido.status === 'finalizado' ? 'success' : selectedPedido.status === 'aberto' ? 'warning' : 'neutral'}>
                    {selectedPedido.status.toUpperCase()}
                  </StatusBadge>
                </div>
              </div>
            </div>

            {/* Observações */}
            {selectedPedido.obs && (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="block text-sm font-medium text-slate-400">Observações</span>
                <p className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">{selectedPedido.obs}</p>
              </div>
            )}

            {/* Tabela de Itens */}
            <div className="space-y-3">
              <span className="block text-sm font-medium text-slate-400">Itens da Compra</span>
              <div className="overflow-hidden border border-white/5 rounded-2xl bg-black/20">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="p-4 text-sm font-medium text-slate-400">Produto</th>
                      <th className="p-4 text-right text-sm font-medium text-slate-400">Qtd</th>
                      <th className="p-4 text-right text-sm font-medium text-slate-400">Custo Unitário</th>
                      <th className="p-4 text-right text-sm font-medium text-slate-400">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((selectedPedido.pedido_compra_itens || selectedPedido.itens || []) as any[]).map((item, idx) => (
                      <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/[0.01] transition-colors">
                        <td className="p-4">
                          <span className="text-xs font-bold text-slate-200">{item.nome}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-xs font-semibold text-slate-300">{item.qty}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-xs font-semibold text-slate-300">{fmt(item.custo_unitario)}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-xs font-black text-teal-400">{fmt(item.total_item || (item.qty * item.custo_unitario))}</span>
                        </td>
                      </tr>
                    ))}
                    {(!selectedPedido.pedido_compra_itens || selectedPedido.pedido_compra_itens.length === 0) && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-sm font-medium text-slate-400">
                          Nenhum item cadastrado neste pedido de compra.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total do Pedido */}
            <div className="flex justify-between items-center p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-sm font-medium text-slate-400">Valor Total da Ordem</span>
              <span className="text-2xl font-black text-[#C5A059] tracking-tight">{fmt(selectedPedido.total)}</span>
            </div>
            
            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedPedido(null)} className="!rounded-xl px-6">
                Fechar Detalhes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!pedidoParaCancelar}
        onCancel={() => setPedidoParaCancelar(null)}
        title="Cancelar Pedido de Compra"
        description="Tem certeza de que deseja cancelar este pedido de compra? Esta operação reverterá o estoque e as contas associadas de forma segura e irreversível."
        confirmLabel="Sim, Cancelar Pedido"
        cancelLabel="Voltar"
        isDestructive
        loading={cancelarMutation.isPending}
        onConfirm={() => {
          if (pedidoParaCancelar) {
            cancelarMutation.mutate(pedidoParaCancelar);
          }
        }}
      />
    </main>
  );
}
