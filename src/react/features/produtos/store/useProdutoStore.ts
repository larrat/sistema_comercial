import { create } from 'zustand';
import type { Produto } from '../../../../types/domain';
import type { ProdutoFiltro, ProdutoSaldo } from '../types';
import { FILTRO_VAZIO } from '../types';

export type ProdutoStoreState = {
  produtos: Produto[];
  parentProdutos: Produto[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  filtro: ProdutoFiltro;
  saldos: Record<string, ProdutoSaldo>;
  categorias: string[];
  auxStatus: 'idle' | 'loading' | 'ready' | 'error';
  auxError: string | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type ProdutoStoreActions = {
  setProdutosPage: (_payload: {
    produtos: Produto[];
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  }) => void;
  setStatus: (_status: ProdutoStoreState['status'], _error?: string) => void;
  setFiltro: (_patch: Partial<ProdutoFiltro>) => void;
  clearFiltro: () => void;
  upsertProduto: (_produto: Produto) => void;
  removeProduto: (_produtoId: string) => void;
  setSaldos: (_saldos: Record<string, ProdutoSaldo>) => void;
  setCategorias: (_categorias: string[]) => void;
  setParentProdutos: (_produtos: Produto[]) => void;
  setAuxStatus: (_status: ProdutoStoreState['auxStatus'], _error?: string) => void;
  setPage: (_page: number) => void;
  setPageSize: (_pageSize: number) => void;
};

export function selectFilteredProdutos(state: ProdutoStoreState): Produto[] {
  const { q, cat } = state.filtro;
  const lower = q.toLowerCase();
  return state.produtos.filter(
    (p) =>
      (!lower ||
        p.nome.toLowerCase().includes(lower) ||
        (p.sku ?? '').toLowerCase().includes(lower)) &&
      (!cat || p.cat === cat)
  );
}

export function selectCategorias(state: ProdutoStoreState): string[] {
  return state.categorias.length
    ? state.categorias
    : [...new Set(state.produtos.map((p) => p.cat ?? '').filter(Boolean))].sort();
}

export const useProdutoStore = create<ProdutoStoreState & ProdutoStoreActions>((set) => ({
  produtos: [],
  parentProdutos: [],
  status: 'idle',
  error: null,
  filtro: { ...FILTRO_VAZIO },
  saldos: {},
  categorias: [],
  auxStatus: 'idle',
  auxError: null,
  page: 1,
  pageSize: 20,
  total: 0,
  pageCount: 1,

  setProdutosPage: ({ produtos, page, pageSize, total, pageCount }) =>
    set({ produtos, page, pageSize, total, pageCount, status: 'ready', error: null }),
  setStatus: (status, error) => set({ status, error: error ?? null }),
  setFiltro: (patch) => set((s) => ({ filtro: { ...s.filtro, ...patch }, page: 1 })),
  clearFiltro: () => set({ filtro: { ...FILTRO_VAZIO }, page: 1 }),
  upsertProduto: (produto) =>
    set((state) => {
      const exists = state.produtos.some((p) => p.id === produto.id);
      const nextProdutos = exists
        ? state.produtos.map((p) => (p.id === produto.id ? produto : p))
        : state.produtos;
      const nextParentProdutos =
        produto.produto_pai_id == null
          ? state.parentProdutos.some((p) => p.id === produto.id)
            ? state.parentProdutos.map((p) => (p.id === produto.id ? produto : p))
            : state.parentProdutos
          : state.parentProdutos.filter((p) => p.id !== produto.id);
      return {
        produtos: nextProdutos,
        parentProdutos: nextParentProdutos,
        status: 'ready',
        error: null
      };
    }),
  removeProduto: (produtoId) =>
    set((state) => ({
      produtos: state.produtos.filter((p) => p.id !== produtoId),
      parentProdutos: state.parentProdutos.filter((p) => p.id !== produtoId),
      total: Math.max(0, state.total - 1),
      pageCount: Math.max(1, Math.ceil(Math.max(0, state.total - 1) / state.pageSize)),
      status: 'ready',
      error: null
    })),
  setSaldos: (saldos) => set({ saldos }),
  setCategorias: (categorias) => set({ categorias }),
  setParentProdutos: (parentProdutos) =>
    set({ parentProdutos: [...parentProdutos].sort((a, b) => a.nome.localeCompare(b.nome)) }),
  setAuxStatus: (auxStatus, auxError) => set({ auxStatus, auxError: auxError ?? null }),
  setPage: (page) => set({ page: Math.max(1, page) }),
  setPageSize: (pageSize) => set({ pageSize: Math.max(1, pageSize), page: 1 })
}));
