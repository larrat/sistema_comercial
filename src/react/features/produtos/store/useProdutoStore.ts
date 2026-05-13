import { create } from 'zustand';
import type { ProdutoFiltro } from '../types';
import { FILTRO_VAZIO } from '../types';

export type ProdutoStoreState = {
  filtro: ProdutoFiltro;
  page: number;
  pageSize: number;
};

export type ProdutoStoreActions = {
  setFiltro: (_patch: Partial<ProdutoFiltro>) => void;
  clearFiltro: () => void;
  setPage: (_page: number) => void;
  setPageSize: (_pageSize: number) => void;
};

export const useProdutoStore = create<ProdutoStoreState & ProdutoStoreActions>((set) => ({
  filtro: { ...FILTRO_VAZIO },
  page: 1,
  pageSize: 20,

  setFiltro: (patch) => set((s) => ({ filtro: { ...s.filtro, ...patch }, page: 1 })),
  clearFiltro: () => set({ filtro: { ...FILTRO_VAZIO }, page: 1 }),
  setPage: (page) => set({ page: Math.max(1, page) }),
  setPageSize: (pageSize) => set({ pageSize: Math.max(1, pageSize), page: 1 })
}));
