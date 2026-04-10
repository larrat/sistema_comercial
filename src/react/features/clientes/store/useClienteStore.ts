import { create } from 'zustand';
import type { Cliente } from '../../../../types/domain';
import type { ClienteFiltro } from '../../../../pilot/clientes/filter';
import { filterClientes, getClienteSegmentos } from '../../../../pilot/clientes/filter';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ClienteStoreState = {
  /** Lista completa carregada do backend */
  clientes: Cliente[];
  /** Estado do carregamento inicial */
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  /** Filtros ativos */
  filtro: ClienteFiltro;
};

export type ClienteStoreActions = {
  setClientes: (clientes: Cliente[]) => void;
  setStatus: (status: ClienteStoreState['status'], error?: string) => void;
  setFiltro: (patch: Partial<ClienteFiltro>) => void;
  clearFiltro: () => void;
  upsertCliente: (cliente: Cliente) => void;
};

// ---------------------------------------------------------------------------
// Selectors derivados (fora do store para evitar re-render desnecessário)
// ---------------------------------------------------------------------------

export function selectFilteredClientes(state: ClienteStoreState): Cliente[] {
  return filterClientes(state.clientes, state.filtro);
}

export function selectSegmentos(state: ClienteStoreState): string[] {
  return getClienteSegmentos(state.clientes);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const FILTRO_VAZIO: ClienteFiltro = { q: '', seg: '', status: '' };

export const useClienteStore = create<ClienteStoreState & ClienteStoreActions>((set) => ({
  clientes: [],
  status: 'idle',
  error: null,
  filtro: { ...FILTRO_VAZIO },

  setClientes: (clientes) => set({ clientes, status: 'ready', error: null }),
  setStatus: (status, error) => set({ status, error: error ?? null }),
  setFiltro: (patch) => set((s) => ({ filtro: { ...s.filtro, ...patch } })),
  clearFiltro: () => set({ filtro: { ...FILTRO_VAZIO } }),
  upsertCliente: (cliente) =>
    set((state) => {
      const exists = state.clientes.some((item) => item.id === cliente.id);
      return {
        clientes: exists
          ? state.clientes.map((item) => (item.id === cliente.id ? cliente : item))
          : [...state.clientes, cliente].sort((a, b) => a.nome.localeCompare(b.nome)),
        status: 'ready',
        error: null
      };
    })
}));
