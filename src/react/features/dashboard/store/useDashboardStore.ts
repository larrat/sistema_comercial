import { create } from 'zustand';
import type { Cliente, Pedido, Produto } from '../../../../types/domain';

export type Periodo = 'semana' | 'mes' | 'ano' | 'tudo';

type DashboardStoreState = {
  periodo: Periodo;
  pedidos: Pedido[];
  produtos: Produto[];
  clientes: Cliente[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
};

type DashboardStoreActions = {
  setPeriodo: (p: Periodo) => void;
  setData: (data: { pedidos: Pedido[]; produtos: Produto[]; clientes: Cliente[] }) => void;
  setStatus: (s: DashboardStoreState['status'], error?: string) => void;
};

export const useDashboardStore = create<DashboardStoreState & DashboardStoreActions>((set) => ({
  periodo: 'mes',
  pedidos: [],
  produtos: [],
  clientes: [],
  status: 'idle',
  error: null,

  setPeriodo: (periodo) => set({ periodo }),
  setData: ({ pedidos, produtos, clientes }) =>
    set({ pedidos, produtos, clientes, status: 'ready', error: null }),
  setStatus: (status, error) => set({ status, error: error ?? null })
}));
