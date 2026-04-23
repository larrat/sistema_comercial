import { create } from 'zustand';
import type { JogoAgenda, Cliente, Pedido, OportunidadeJogo } from '../../../../types/domain';

export type RelatoriosTab = 'oportunidades' | 'performance' | 'clientes';

type RelatoriosState = {
  activeTab: RelatoriosTab;
  jogos: JogoAgenda[];
  clientes: Cliente[];
  pedidos: Pedido[];
  loading: boolean;
  error: string | null;
  reloadKey: number;
  filtroAno: string;
  filtroMes: string;
  validacaoOpen: boolean;
  validacaoItem: OportunidadeJogo | null;
};

type RelatoriosActions = {
  setActiveTab: (tab: RelatoriosTab) => void;
  setJogos: (jogos: JogoAgenda[]) => void;
  setClientes: (clientes: Cliente[]) => void;
  setPedidos: (pedidos: Pedido[]) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  requestReload: () => void;
  setFiltroAno: (v: string) => void;
  setFiltroMes: (v: string) => void;
  openValidacao: (item: OportunidadeJogo) => void;
  closeValidacao: () => void;
};

export const useRelatoriosStore = create<RelatoriosState & RelatoriosActions>((set) => ({
  activeTab: 'oportunidades',
  jogos: [],
  clientes: [],
  pedidos: [],
  loading: false,
  error: null,
  reloadKey: 0,
  filtroAno: '',
  filtroMes: '',
  validacaoOpen: false,
  validacaoItem: null,

  setActiveTab: (activeTab) => set({ activeTab }),
  setJogos: (jogos) => set({ jogos }),
  setClientes: (clientes) => set({ clientes }),
  setPedidos: (pedidos) => set({ pedidos }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  requestReload: () => set((s) => ({ reloadKey: s.reloadKey + 1 })),
  setFiltroAno: (filtroAno) => set({ filtroAno }),
  setFiltroMes: (filtroMes) => set({ filtroMes }),
  openValidacao: (validacaoItem) => set({ validacaoOpen: true, validacaoItem }),
  closeValidacao: () => set({ validacaoOpen: false, validacaoItem: null })
}));
