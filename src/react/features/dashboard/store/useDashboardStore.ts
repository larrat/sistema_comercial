import { create } from 'zustand';
import type { Cliente, Pedido, Produto, ContaReceber, Filial } from '../../../../types/domain';
import { readStorageString, writeStorageString } from '../../../app/lib/storage';

export type Periodo = 'semana' | 'mes' | 'ano' | 'tudo';
export type Visao = 'operacional' | 'gerencial' | 'analitico';

type DashboardStoreState = {
  periodo: Periodo;
  visao: Visao;
  pedidos: Pedido[];
  produtos: Produto[];
  clientes: Cliente[];
  contasReceber: ContaReceber[];
  filial: Filial | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
};

type DashboardStoreActions = {
  setPeriodo: (p: Periodo) => void;
  setVisao: (v: Visao) => void;
  setData: (data: {
    pedidos: Pedido[];
    produtos: Produto[];
    clientes: Cliente[];
    contasReceber: ContaReceber[];
    filial?: Filial | null;
  }) => void;
  setStatus: (s: DashboardStoreState['status'], error?: string) => void;
};

const STORAGE_KEYS = {
  periodo: 'sc_dashboard_periodo',
  visao: 'sc_dashboard_visao'
};

function getInitialPeriodo(): Periodo {
  const saved = readStorageString(STORAGE_KEYS.periodo);
  return (saved as Periodo) || 'mes';
}

function getInitialVisao(): Visao {
  const saved = readStorageString(STORAGE_KEYS.visao);
  return (saved as Visao) || 'analitico';
}

export const useDashboardStore = create<DashboardStoreState & DashboardStoreActions>((set) => ({
  periodo: getInitialPeriodo(),
  visao: getInitialVisao(),
  pedidos: [],
  produtos: [],
  clientes: [],
  contasReceber: [],
  filial: null,
  status: 'idle',
  error: null,

  setPeriodo: (periodo) => {
    writeStorageString(STORAGE_KEYS.periodo, periodo);
    set({ periodo });
  },
  setVisao: (visao) => {
    writeStorageString(STORAGE_KEYS.visao, visao);
    set({ visao });
  },
  setData: ({ pedidos, produtos, clientes, contasReceber, filial }) =>
    set({
      pedidos,
      produtos,
      clientes,
      contasReceber,
      filial: filial ?? null,
      status: 'ready',
      error: null
    }),
  setStatus: (status, error) => set({ status, error: error ?? null })
}));
