import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listPedidosPage,
  listPedidosSummary,
  getPedidoById,
  savePedido,
  updatePedidoStatus,
  marcarPedidoEntregue,
  cancelarPedidoSeguro,
  adicionarPedidoItem,
  removerPedidoItem,
  atualizarPedidoItem,
  type PedidoListFilters,
  type PedidoSaveInput,
  type CancelamentoPedidoResult
} from '../services/pedidosApi';
import { gerarContaForcado, type ContaReceberInput } from '../../contas-receber/services/contasReceberApi';
import { listClientesLight } from '../../clientes/services/clientesApi';
import { listRcas } from '../../rcas/services/rcasApi';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import type { Pedido, PedidoItem, ContaReceber, ContaReceberBaixa } from '../../../../types/domain';

export type PedidoFinanceiroState = {
  conta: ContaReceber | null;
  baixas: ContaReceberBaixa[];
  loading?: boolean;
  error?: string | null;
};

export function useClientesLightQuery() {
  const { resolve } = useApiContext();
  const context = resolve();

  return useQuery({
    queryKey: ['clientes-light', context?.filialId],
    queryFn: () => {
      if (!context) throw new Error('API context not ready');
      return listClientesLight(context);
    },
    enabled: !!context,
    staleTime: 30000 // 30 seconds
  });
}

export function useRcasQuery() {
  const { resolve } = useApiContext();
  const context = resolve();

  return useQuery({
    queryKey: ['rcas', context?.filialId],
    queryFn: () => {
      if (!context) throw new Error('API context not ready');
      return listRcas(context);
    },
    enabled: !!context,
    staleTime: 30000 // 30 seconds
  });
}

export function usePedidosQuery(filters: PedidoListFilters = {}, page = 1, pageSize = 20) {
  const { resolve } = useApiContext();
  const context = resolve();

  return useQuery({
    queryKey: ['pedidos', context?.filialId, filters, page, pageSize],
    queryFn: () => {
      if (!context) throw new Error('API context not ready');
      return listPedidosPage(context, { ...filters, page, pageSize });
    },
    enabled: !!context,
    staleTime: 30000 // 30 seconds
  });
}

export function usePedidoQuery(id: string | null | undefined) {
  const { resolve } = useApiContext();
  const context = resolve();

  return useQuery({
    queryKey: ['pedido', context?.filialId, id],
    queryFn: () => {
      if (!context || !id) return null;
      return getPedidoById(context, id);
    },
    staleTime: 15000, // 15 seconds
    enabled: !!context && !!id
  });
}

export function usePedidosSummaryQuery() {
  const { resolve } = useApiContext();
  const context = resolve();

  return useQuery({
    queryKey: ['pedidos-summary', context?.filialId],
    queryFn: () => {
      if (!context) throw new Error('API context not ready');
      return listPedidosSummary(context);
    },
    enabled: !!context,
    staleTime: 30000 // 30 seconds
  });
}

export function usePedidoFinanceiroQuery(pedidoId: string | null | undefined) {
  const { resolve } = useApiContext();
  const context = resolve();

  return useQuery({
    queryKey: ['pedido-financeiro', context?.filialId, pedidoId],
    queryFn: async () => {
      if (!context || !pedidoId) return null;
      // Precisamos importar listContas e listBaixas ou mover para pedidosApi
      // Por enquanto vamos assumir que as funções existem no contexto do módulo financeiro
      const { listContas, listBaixas } =
        await import('../../contas-receber/services/contasReceberApi');
      const [contas, baixas] = await Promise.all([listContas(context), listBaixas(context)]);
      const conta = contas.find((item) => item.pedido_id === pedidoId) ?? null;
      const baixasDoPedido = conta
        ? baixas.filter((item) => item.conta_receber_id === conta.id)
        : [];

      return {
        conta,
        baixas: baixasDoPedido
      };
    },
    enabled: !!context && !!pedidoId
  });
}

export function usePedidoMutations() {
  const queryClient = useQueryClient();
  const { resolve } = useApiContext();
  const context = resolve();

  const save = useMutation({
    mutationFn: (input: PedidoSaveInput) => {
      if (!context) throw new Error('API context not ready');
      return savePedido(context, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-summary'] });
      queryClient.invalidateQueries({ queryKey: ['pedido'] });
      // Invalida produtos também pois o estoque muda
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Pedido salvo com sucesso!');
    },
    onError: (error) => {
      toast.error(
        'Erro ao salvar pedido: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
      );
    }
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => {
      if (!context) throw new Error('API context not ready');
      return updatePedidoStatus(context, id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-summary'] });
      queryClient.invalidateQueries({ queryKey: ['pedido'] });
      toast.success('Status do pedido atualizado!');
    },
    onError: (error) => {
      toast.error(
        'Erro ao atualizar status: ' +
          (error instanceof Error ? error.message : 'Erro desconhecido')
      );
    }
  });

  const cancelarPedido = useMutation({
    mutationFn: ({ pedido, isRecusaAvaria, motivo }: { pedido: Pedido; isRecusaAvaria?: boolean; motivo?: string }) => {
      if (!context) throw new Error('API context not ready');
      // Validação de NF-e emitida feita também no RPC, mas bloqueamos cedo no cliente
      if (pedido.fiscal_status === 'emitido') {
        throw new Error('Não é permitido cancelar um pedido com Nota Fiscal já emitida na SEFAZ. Por favor, cancele ou estorne a Nota Fiscal primeiro no painel fiscal.');
      }
      const motivoFinal = isRecusaAvaria
        ? 'Recusa por avaria no transporte'
        : (motivo ?? 'Cancelado pelo operador');
      return cancelarPedidoSeguro(context, pedido.id, motivoFinal);
    },
    onSuccess: (resultado: CancelamentoPedidoResult) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-summary'] });
      queryClient.invalidateQueries({ queryKey: ['pedido'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['pedido-financeiro'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      if (resultado.ja_cancelado) {
        toast.info('Este pedido já estava cancelado.');
      } else {
        const partes: string[] = ['Pedido cancelado com sucesso.'];
        if (resultado.contas_canceladas > 0) {
          partes.push(`${resultado.contas_canceladas} conta(s) a receber estornada(s).`);
        }
        if (resultado.itens_estoque_revertidos > 0) {
          partes.push(`${resultado.itens_estoque_revertidos} item(ns) devolvido(s) ao estoque.`);
        }
        toast.success(partes.join(' '));
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const reabrirPedido = useMutation({
    mutationFn: (pedido: Pedido) => {
      if (!context) throw new Error('API context not ready');
      return updatePedidoStatus(context, pedido.id, 'orcamento');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast.success('Pedido reaberto.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const gerarContaManual = useMutation({
    mutationFn: async (pedido: Pedido) => {
      if (!context) throw new Error('API context not ready');
      const contaInput: ContaReceberInput = {
        pedido_id: pedido.id,
        pedido_num: pedido.num ?? 0,
        cliente_id: pedido.cliente_id ?? null,
        cliente: pedido.cli ?? '',
        valor: pedido.total ?? 0,
        data: pedido.data as string | undefined,
        prazo: pedido.prazo as string | undefined
      };
      await gerarContaForcado(context, contaInput);
      return 'Conta a receber gerada com sucesso.';
    },
    onSuccess: (msg) => {
      queryClient.invalidateQueries({ queryKey: ['pedido-financeiro'] });
      toast.success(msg);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const confirmarEntrega = useMutation({
    mutationFn: (id: string) => {
      if (!context) throw new Error('API context not ready');
      return marcarPedidoEntregue(context, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-summary'] });
      queryClient.invalidateQueries({ queryKey: ['pedido'] });
      toast.success('Entrega confirmada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao confirmar entrega: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      console.error('[pedidos] Erro confirmarEntrega:', error);
    }
  });

  const addItem = useMutation({
    mutationFn: ({
      pedidoId,
      item
    }: {
      pedidoId: string;
      item: Pick<PedidoItem, 'prodId' | 'qty' | 'preco'>;
    }) => {
      if (!context) throw new Error('API context not ready');
      return adicionarPedidoItem(context, pedidoId, item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Item adicionado ao pedido!');
    }
  });

  const removeItem = useMutation({
    mutationFn: ({ pedidoId, itemId }: { pedidoId: string; itemId: string }) => {
      if (!context) throw new Error('API context not ready');
      return removerPedidoItem(context, pedidoId, itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Item removido do pedido!');
    }
  });

  const updateItem = useMutation({
    mutationFn: ({
      pedidoId,
      itemId,
      patch
    }: {
      pedidoId: string;
      itemId: string;
      patch: { quantidade?: number; precoUnitario?: number };
    }) => {
      if (!context) throw new Error('API context not ready');
      return atualizarPedidoItem(context, pedidoId, itemId, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Item do pedido atualizado!');
    }
  });

  return {
    save,
    updateStatus,
    confirmarEntrega,
    addItem,
    removeItem,
    updateItem,
    cancelarPedido,
    reabrirPedido,
    gerarContaManual
  };
}
