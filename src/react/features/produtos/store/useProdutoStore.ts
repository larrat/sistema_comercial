import { create } from 'zustand';
import type { Produto } from '../../../../types/domain';
import type { ProdutoFiltro, ProdutoSaldo } from '../types';
import { FILTRO_VAZIO } from '../types';

export type ProdutoStoreState = {
  produtos: Produto[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  filtro: ProdutoFiltro;
  saldos: Record<string, ProdutoSaldo>;
};

export type ProdutoStoreActions = {
  setProdutos: (_produtos: Produto[]) => void;
  setStatus: (_status: ProdutoStoreState['status'], _error?: string) => void;
  setFiltro: (_patch: Partial<ProdutoFiltro>) => void;
  clearFiltro: () => void;
  upsertProduto: (_produto: Produto) => void;
  removeProduto: (_produtoId: string) => void;
  setSaldos: (_saldos: Record<string, ProdutoSaldo>) => void;
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
  return [...new Set(state.produtos.map((p) => p.cat ?? '').filter(Boolean))].sort();
}

export const useProdutoStore = create<ProdutoStoreState & ProdutoStoreActions>((set) => ({
  produtos: [],
  status: 'idle',
  error: null,
  filtro: { ...FILTRO_VAZIO },
  saldos: {},

  setProdutos: (produtos) => set({ produtos, status: 'ready', error: null }),
  setStatus: (status, error) => set({ status, error: error ?? null }),
  setFiltro: (patch) => set((s) => ({ filtro: { ...s.filtro, ...patch } })),
  clearFiltro: () => set({ filtro: { ...FILTRO_VAZIO } }),
  upsertProduto: (produto) =>
    set((state) => {
      const exists = state.produtos.some((p) => p.id === produto.id);
      return {
        produtos: exists
          ? state.produtos.map((p) => (p.id === produto.id ? produto : p))
          : [...state.produtos, produto].sort((a, b) => a.nome.localeCompare(b.nome)),
        status: 'ready',
        error: null
      };
    }),
  removeProduto: (produtoId) =>
    set((state) => ({
      produtos: state.produtos.filter((p) => p.id !== produtoId),
      status: 'ready',
      error: null
    })),
  setSaldos: (saldos) => set({ saldos })
}));
