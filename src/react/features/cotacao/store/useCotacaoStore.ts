import type { Produto } from '../../../../types/domain';
import { create } from 'zustand';
import { deriveCotacaoState } from '../services/cotacaoApi';

import type {
  CotacaoConfig,
  CotacaoFornecedorRow,
  CotacaoImportContext,
  CotacaoMetrics,
  CotacaoTabId,
  CotacaoTabelaRow,
  Fornecedor,
  ImportResumo,
  PrecosMap
} from '../types';

type FornDraft = {
  nome: string;
  contato: string;
  prazo: string;
};

type CotacaoStoreState = {
  activeTab: CotacaoTabId;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  metrics: CotacaoMetrics;
  fornecedores: Fornecedor[];
  fornecedoresRows: CotacaoFornecedorRow[];
  produtos: Produto[];
  precos: PrecosMap;
  tabela: CotacaoTabelaRow[];
  config: CotacaoConfig | null;
  reloadVersion: number;
  fornModal: {
    open: boolean;
    draft: FornDraft;
  };
  importMapOpen: boolean;
  importContext: CotacaoImportContext | null;
  importProgress: { pct: number; msg: string } | null;
  importResumo: ImportResumo | null;
};

type CotacaoStoreActions = {
  setActiveTab: (tab: CotacaoTabId) => void;
  setStatus: (status: CotacaoStoreState['status'], error?: string | null) => void;
  setData: (payload: {
    metrics: CotacaoMetrics;
    fornecedores: Fornecedor[];
    fornecedoresRows: CotacaoFornecedorRow[];
    produtos: Produto[];
    precos: PrecosMap;
    tabela: CotacaoTabelaRow[];
    config: CotacaoConfig;
  }) => void;
  setConfig: (config: CotacaoConfig) => void;
  setPrecos: (precos: PrecosMap) => void;
  applyPrecos: (precos: PrecosMap) => void;
  requestReload: () => void;
  openFornModal: () => void;
  closeFornModal: () => void;
  updateFornDraft: (patch: Partial<FornDraft>) => void;
  setImportContext: (context: CotacaoImportContext | null) => void;
  openImportMap: () => void;
  closeImportMap: () => void;
  setImportProgress: (pct: number, msg: string) => void;
  clearImportProgress: () => void;
  setImportResumo: (resumo: ImportResumo | null) => void;
  clearImportResumo: () => void;
};

const EMPTY_METRICS: CotacaoMetrics = {
  produtos: 0,
  fornecedores: 0,
  preenchimento: 0,
  melhorFornecedor: null
};

function createEmptyDraft(): FornDraft {
  return {
    nome: '',
    contato: '',
    prazo: ''
  };
}

export const useCotacaoStore = create<CotacaoStoreState & CotacaoStoreActions>((set) => ({
  activeTab: 'cotacao',
  status: 'idle',
  error: null,
  metrics: EMPTY_METRICS,
  fornecedores: [],
  fornecedoresRows: [],
  produtos: [],
  precos: {},
  tabela: [],
  config: null,
  reloadVersion: 0,
  fornModal: {
    open: false,
    draft: createEmptyDraft()
  },
  importMapOpen: false,
  importContext: null,
  importProgress: null,
  importResumo: null,

  setActiveTab: (activeTab) => set({ activeTab }),
  setStatus: (status, error = null) => set({ status, error }),
  setData: ({ metrics, fornecedores, fornecedoresRows, produtos, precos, tabela, config }) =>
    set({
      metrics,
      fornecedores,
      fornecedoresRows,
      produtos,
      precos,
      tabela,
      config,
      status: 'ready',
      error: null
    }),
  setConfig: (config) => set({ config }),
  setPrecos: (precos) => set({ precos }),
  applyPrecos: (precos) =>
    set((state) => {
      const derived = deriveCotacaoState(state.produtos, state.fornecedores, precos);
      return {
        precos,
        metrics: derived.metrics,
        fornecedoresRows: derived.fornecedoresRows,
        tabela: derived.tabela
      };
    }),
  requestReload: () => set((state) => ({ reloadVersion: state.reloadVersion + 1 })),
  openFornModal: () =>
    set({
      fornModal: {
        open: true,
        draft: createEmptyDraft()
      }
    }),
  closeFornModal: () =>
    set({
      fornModal: {
        open: false,
        draft: createEmptyDraft()
      }
    }),
  updateFornDraft: (patch) =>
    set((state) => ({
      fornModal: {
        ...state.fornModal,
        draft: {
          ...state.fornModal.draft,
          ...patch
        }
      }
    })),
  setImportContext: (importContext) => set({ importContext }),
  openImportMap: () => set({ importMapOpen: true }),
  closeImportMap: () =>
    set({
      importMapOpen: false,
      importContext: null,
      importProgress: null
    }),
  setImportProgress: (pct, msg) => set({ importProgress: { pct, msg } }),
  clearImportProgress: () => set({ importProgress: null }),
  setImportResumo: (importResumo) => set({ importResumo }),
  clearImportResumo: () => set({ importResumo: null })
}));
