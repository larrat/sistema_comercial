import { create } from 'zustand';
import type { Pedido } from '../../../../types/domain';
import type { PedidoFiltro, PedidoTab } from '../types';
import { TAB_STATUSES, normalizePedStatus } from '../types';

export type PedidoStoreState = {
  pedidos: Pedido[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  activeTab: PedidoTab;
  filtro: PedidoFiltro;
  /** IDs com operação assíncrona em andamento (evita double-submit) */
  inFlight: Set<string>;
};

export type PedidoStoreActions = {
  setPedidos: (_pedidos: Pedido[]) => void;
  setStatus: (_status: PedidoStoreState['status'], _error?: string) => void;
  setActiveTab: (_tab: PedidoTab) => void;
  setFiltro: (_patch: Partial<PedidoFiltro>) => void;
  clearFiltro: () => void;
  upsertPedido: (_pedido: Pedido) => void;
  setInFlight: (_id: string, _active: boolean) => void;
};

const FILTRO_VAZIO: PedidoFiltro = { q: '', status: '' };

export function selectPedidosForTab(state: PedidoStoreState): Pedido[] {
  const tabStatuses = TAB_STATUSES[state.activeTab];
  let list = state.pedidos.filter((p) => tabStatuses.includes(normalizePedStatus(p.status)));

  if (state.filtro.q) {
    const q = state.filtro.q.toLowerCase();
    list = list.filter(
      (p) =>
        String(p.cli ?? '')
          .toLowerCase()
          .includes(q) || String(p.num ?? '').includes(q)
    );
  }

  if (state.filtro.status) {
    list = list.filter((p) => normalizePedStatus(p.status) === state.filtro.status);
  }

  return list;
}

export const usePedidoStore = create<PedidoStoreState & PedidoStoreActions>((set) => ({
  pedidos: [],
  status: 'idle',
  error: null,
  activeTab: 'emaberto',
  filtro: { ...FILTRO_VAZIO },
  inFlight: new Set(),

  setPedidos: (pedidos) => set({ pedidos, status: 'ready', error: null }),
  setStatus: (status, error) => set({ status, error: error ?? null }),
  setActiveTab: (activeTab) => set({ activeTab, filtro: { ...FILTRO_VAZIO } }),
  setFiltro: (patch) => set((s) => ({ filtro: { ...s.filtro, ...patch } })),
  clearFiltro: () => set({ filtro: { ...FILTRO_VAZIO } }),
  upsertPedido: (pedido) =>
    set((state) => ({
      pedidos: state.pedidos.some((p) => p.id === pedido.id)
        ? state.pedidos.map((p) => (p.id === pedido.id ? pedido : p))
        : [pedido, ...state.pedidos]
    })),
  setInFlight: (id, active) =>
    set((state) => {
      const next = new Set(state.inFlight);
      if (active) next.add(id);
      else next.delete(id);
      return { inFlight: next };
    })
}));
