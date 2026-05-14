import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listClientesPage,
  listClienteSegmentos,
  saveCliente,
  deleteCliente,
  type ClienteListFilters,
  type ClienteWriteInput
} from '../services/clientesApi';
import { useApiContext } from '../../../shared/hooks/useApiContext';

export function useClientesQuery(filters: ClienteListFilters = {}, page = 1, pageSize = 20) {
  const { resolve } = useApiContext();
  const context = resolve();

  return useQuery({
    queryKey: ['clientes', context?.filialId, filters, page, pageSize],
    queryFn: () => {
      if (!context) throw new Error('API context not ready');
      return listClientesPage(context, { ...filters, page, pageSize });
    },
    enabled: !!context,
    staleTime: 30000 // 30 seconds
  });
}

export function useSegmentosQuery() {
  const { resolve } = useApiContext();
  const context = resolve();

  return useQuery({
    queryKey: ['segmentos', context?.filialId],
    queryFn: () => {
      if (!context) throw new Error('API context not ready');
      return listClienteSegmentos(context);
    },
    enabled: !!context,
    staleTime: 10 * 60 * 1000 // 10 minutes
  });
}

export function useClienteMutations() {
  const queryClient = useQueryClient();
  const { resolve } = useApiContext();
  const context = resolve();

  const save = useMutation({
    mutationFn: (input: ClienteWriteInput) => {
      if (!context) throw new Error('API context not ready');
      return saveCliente(context, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente salvo com sucesso!');
    },
    onError: (error) => {
      toast.error(
        'Erro ao salvar cliente: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
      );
    }
  });

  const remove = useMutation({
    mutationFn: (id: string) => {
      if (!context) throw new Error('API context not ready');
      return deleteCliente(context, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente removido com sucesso!');
    },
    onError: (error) => {
      toast.error(
        'Erro ao remover cliente: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
      );
    }
  });

  return { save, remove };
}
