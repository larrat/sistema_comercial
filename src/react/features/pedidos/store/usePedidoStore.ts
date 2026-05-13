import { create } from 'zustand';
import type { PedidoFiltro, PedidoTab } from '../types';

export type PedidoStoreState = {
  activeTab: PedidoTab;
  filtro: PedidoFiltro;
  page: number;
  pageSize: number;
};

export type PedidoStoreActions = {
  setActiveTab: (_tab: PedidoTab) => void;
  setFiltro: (_patch: Partial<PedidoFiltro>) => void;
  clearFiltro: () => void;
  setPage: (_page: number) => void;
  setPageSize: (_pageSize: number) => void;
};

const FILTRO_VAZIO: PedidoFiltro = {
  q: '',
  status: '',
  pgto: '',
  periodo: '',
  sort: 'data_desc'
};

export const usePedidoStore = create<PedidoStoreState & PedidoStoreActions>((set) => ({
  activeTab: 'emaberto',
  filtro: { ...FILTRO_VAZIO },
  page: 1,
  pageSize: 20,

  setActiveTab: (activeTab) => set({ activeTab, filtro: { ...FILTRO_VAZIO }, page: 1 }),
  setFiltro: (patch) => set((s) => ({ filtro: { ...s.filtro, ...patch }, page: 1 })),
  clearFiltro: () => set({ filtro: { ...FILTRO_VAZIO }, page: 1 }),
  setPage: (page) => set({ page: Math.max(1, page) }),
  setPageSize: (pageSize) => set({ pageSize: Math.max(1, pageSize), page: 1 })
}));
