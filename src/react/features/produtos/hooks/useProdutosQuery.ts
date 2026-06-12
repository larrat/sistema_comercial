import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listProdutosPage,
  listProdutoCategorias,
  saveProduto,
  deleteProduto,
  listVariantesByPaiId,
  listProdutoById,
  listProdutoPais,
  cascadeRenameProduto,
  cascadeUpdateFilhos,
  listMovimentacoesByProdutoIds,
  listPedidoItensByProdutoIds,
  type ProdutoListFilters,
  type ProdutoListPageQuery
} from '../services/produtosApi';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import type { ProdutoWriteInput } from '../types';
import type { Produto } from '../../../../types/domain';

export function useProdutosQuery(filters: ProdutoListFilters = {}, page = 1, pageSize = 20) {
  const { resolve } = useApiContext();
  const context = resolve();

  return useQuery({
    queryKey: ['produtos', context?.filialId, filters, page, pageSize],
    queryFn: () => {
      if (!context) throw new Error('API context not ready');
      return listProdutosPage(context, { ...filters, page, pageSize });
    },
    enabled: !!context,
    staleTime: 30000 // 30 seconds
  });
}

export function useProdutoQuery(id: string | null | undefined) {
  const { resolve } = useApiContext();
  const context = resolve();

  return useQuery({
    queryKey: ['produto', context?.filialId, id],
    queryFn: () => {
      if (!context || !id) return null;
      return listProdutoById(context, id);
    },
    enabled: !!context && !!id,
    staleTime: 15000 // 15 seconds
  });
}

export function usePaisQuery() {
  const { resolve } = useApiContext();
  const context = resolve();

  return useQuery({
    queryKey: ['produtos-pais', context?.filialId],
    queryFn: () => {
      if (!context) throw new Error('API context not ready');
      return listProdutoPais(context);
    },
    enabled: !!context,
    staleTime: 30000 // 30 seconds
  });
}

export function useCategoriasQuery() {
  const { resolve } = useApiContext();
  const context = resolve();

  return useQuery({
    queryKey: ['categorias', context?.filialId],
    queryFn: () => {
      if (!context) throw new Error('API context not ready');
      return listProdutoCategorias(context);
    },
    enabled: !!context,
    staleTime: 30000 // 30 seconds
  });
}

export function useVariantesQuery(paiId: string | null | undefined) {
  const { resolve } = useApiContext();
  const context = resolve();

  return useQuery({
    queryKey: ['variantes', context?.filialId, paiId],
    queryFn: () => {
      if (!context || !paiId) return [];
      return listVariantesByPaiId(context, paiId);
    },
    enabled: !!context && !!paiId
  });
}

export function useMovimentacoesQuery(produtoIds: string[]) {
  const { resolve } = useApiContext();
  const context = resolve();

  return useQuery({
    queryKey: ['movimentacoes', context?.filialId, produtoIds],
    queryFn: () => {
      if (!context || !produtoIds.length) return [];
      return listMovimentacoesByProdutoIds(context, produtoIds);
    },
    enabled: !!context && !!produtoIds.length
  });
}

export function useVendasVariantesQuery(produtoIds: string[], fromDate?: string, toDate?: string) {
  const { resolve } = useApiContext();
  const context = resolve();

  return useQuery({
    queryKey: ['vendas-variantes', context?.filialId, produtoIds, fromDate, toDate],
    queryFn: () => {
      if (!context || !produtoIds.length) return [];
      return listPedidoItensByProdutoIds(context, produtoIds, fromDate, toDate);
    },
    enabled: !!context && !!produtoIds.length
  });
}

export function useProdutoMutations() {
  const queryClient = useQueryClient();
  const { resolve } = useApiContext();
  const context = resolve();

  const save = useMutation({
    mutationFn: (input: ProdutoWriteInput | ProdutoWriteInput[]) => {
      if (!context) throw new Error('API context not ready');
      return saveProduto(context, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['produto'] });
      queryClient.invalidateQueries({ queryKey: ['variantes'] });
      queryClient.invalidateQueries({ queryKey: ['produtos-pais'] });
      toast.success('Produto salvo com sucesso!');
    },
    onError: (error) => {
      toast.error(
        'Erro ao salvar produto: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
      );
    }
  });

  const saveGrade = useMutation({
    mutationFn: async ({ parent, cores, tamanhos }: { parent: ProdutoWriteInput; cores: string[]; tamanhos: string[] }) => {
      if (!context) throw new Error('API context not ready');
      const { url, key } = getSupabaseConfig();
      const res = await fetch(`${url}/rest/v1/rpc/rpc_salvar_produto_grade`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${context.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_produto: parent, p_cores: cores, p_tamanhos: tamanhos })
      });
      if (!res.ok) throw new Error('Falha ao salvar grade de produtos');
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['produto'] });
      queryClient.invalidateQueries({ queryKey: ['variantes'] });
      queryClient.invalidateQueries({ queryKey: ['produtos-pais'] });
      toast.success(data?.total_inseridos > 1 ? `Produto pai e variantes criados com sucesso!` : 'Produto salvo com sucesso!');
    },
    onError: (error) => {
      toast.error(
        'Erro ao salvar grade: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
      );
    }
  });

  const remove = useMutation({
    mutationFn: (id: string) => {
      if (!context) throw new Error('API context not ready');
      return deleteProduto(context, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['produto'] });
      queryClient.invalidateQueries({ queryKey: ['produtos-pais'] });
      queryClient.invalidateQueries({ queryKey: ['variantes'] });
      toast.success('Produto removido com sucesso!');
    },
    onError: (error) => {
      toast.error(
        'Erro ao remover produto: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
      );
    }
  });

  const cascadeRename = useMutation({
    mutationFn: ({ id, novoNome, antigoNome }: { id: string; novoNome: string; antigoNome: string }) => {
      if (!context) throw new Error('API context not ready');
      return cascadeRenameProduto(context, id, novoNome, antigoNome);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['produto'] });
      toast.success('Histórico de nomes atualizado!');
    }
  });

  const cascadeUpdate = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Produto> }) => {
      if (!context) throw new Error('API context not ready');
      return cascadeUpdateFilhos(context, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      queryClient.invalidateQueries({ queryKey: ['variantes'] });
      toast.success('Variantes atualizadas com sucesso!');
    }
  });

  return { save, saveGrade, remove, cascadeRename, cascadeUpdate };
}
