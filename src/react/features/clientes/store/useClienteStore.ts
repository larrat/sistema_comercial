import { create } from 'zustand';
import type { Cliente } from '../../../../types/domain';
import type { ClienteFiltro } from '../../../../pilot/clientes/filter';
import { filterClientes, getClienteSegmentos } from '../../../../pilot/clientes/filter';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ClienteStoreState = {
  /** Página atual carregada do backend */
  clientes: Cliente[];
  /** Lista completa filtrada, carregada sob demanda para superfícies auxiliares */
  segmentClientes: Cliente[];
  /** Estado do carregamento inicial */
  status: 'idle' | 'loading' | 'ready' | 'error';
  segmentStatus: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  segmentError: string | null;
  /** Filtros ativos */
  filtro: ClienteFiltro;
  segmentos: string[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type ClienteStoreActions = {
  setClientesPage: (_payload: {
    clientes: Cliente[];
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  }) => void;
  setSegmentClientes: (_clientes: Cliente[]) => void;
  setSegmentos: (_segmentos: string[]) => void;
  setStatus: (_status: ClienteStoreState['status'], _error?: string) => void;
  setSegmentStatus: (_status: ClienteStoreState['segmentStatus'], _error?: string) => void;
  setFiltro: (_patch: Partial<ClienteFiltro>) => void;
  clearFiltro: () => void;
  setPage: (_page: number) => void;
  setPageSize: (_pageSize: number) => void;
  upsertCliente: (_cliente: Cliente) => void;
  removeCliente: (_clienteId: string) => void;
};

// ---------------------------------------------------------------------------
// Selectors derivados (fora do store para evitar re-render desnecessário)
// ---------------------------------------------------------------------------

export function selectFilteredClientes(state: ClienteStoreState): Cliente[] {
  return filterClientes(state.segmentClientes, state.filtro);
}

export function selectSegmentos(state: ClienteStoreState): string[] {
  return state.segmentos.length ? state.segmentos : getClienteSegmentos(state.segmentClientes);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const FILTRO_VAZIO: ClienteFiltro = { q: '', seg: '', status: '' };

export const useClienteStore = create<ClienteStoreState & ClienteStoreActions>((set) => ({
  clientes: [],
  segmentClientes: [],
  status: 'idle',
  segmentStatus: 'idle',
  error: null,
  segmentError: null,
  filtro: { ...FILTRO_VAZIO },
  segmentos: [],
  page: 1,
  pageSize: 20,
  total: 0,
  pageCount: 1,

  setClientesPage: ({ clientes, page, pageSize, total, pageCount }) =>
    set({
      clientes,
      page,
      pageSize,
      total,
      pageCount,
      status: 'ready',
      error: null
    }),
  setSegmentClientes: (segmentClientes) =>
    set({
      segmentClientes,
      segmentStatus: 'ready',
      segmentError: null
    }),
  setSegmentos: (segmentos) => set({ segmentos }),
  setStatus: (status, error) => set({ status, error: error ?? null }),
  setSegmentStatus: (segmentStatus, segmentError) =>
    set({ segmentStatus, segmentError: segmentError ?? null }),
  setFiltro: (patch) =>
    set((s) => ({
      filtro: { ...s.filtro, ...patch },
      page: 1
    })),
  clearFiltro: () =>
    set({
      filtro: { ...FILTRO_VAZIO },
      page: 1
    }),
  setPage: (page) => set({ page: Math.max(1, page) }),
  setPageSize: (pageSize) =>
    set({
      pageSize: Math.max(1, pageSize),
      page: 1
    }),
  upsertCliente: (cliente) =>
    set((state) => {
      const exists = state.clientes.some((item) => item.id === cliente.id);
      const nextClientes = exists
        ? state.clientes.map((item) => (item.id === cliente.id ? cliente : item))
        : state.clientes;
      const nextSegmentClientes = state.segmentClientes.some((item) => item.id === cliente.id)
        ? state.segmentClientes.map((item) => (item.id === cliente.id ? cliente : item))
        : state.segmentClientes;
      return {
        clientes: nextClientes,
        segmentClientes: nextSegmentClientes,
        status: 'ready',
        error: null
      };
    }),
  removeCliente: (clienteId) =>
    set((state) => ({
      clientes: state.clientes.filter((item) => item.id !== clienteId),
      segmentClientes: state.segmentClientes.filter((item) => item.id !== clienteId),
      total: Math.max(0, state.total - 1),
      pageCount: Math.max(1, Math.ceil(Math.max(0, state.total - 1) / state.pageSize)),
      status: 'ready',
      error: null
    }))
}));
