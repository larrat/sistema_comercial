import { create } from 'zustand';
import type {
  Fornecedor,
  CotacaoConfig,
  CotacaoView,
  CotacaoStatus,
  PrecosMap,
  ImportMapContext,
  ImportResumo
} from '../types';

type CotacaoStoreState = {
  view: CotacaoView;
  status: CotacaoStatus;
  error: string | null;
  fornecedores: Fornecedor[];
  precos: PrecosMap;
  config: CotacaoConfig | null;
  reloadVersion: number;
  // fornecedor form modal
  fornModal: { open: boolean; draft: FornDraft };
  // import
  importContext: ImportMapContext | null;
  importMapOpen: boolean;
  importProgress: { pct: number; msg: string } | null;
  importResumo: ImportResumo | null;
};

export type FornDraft = {
  nome: string;
  contato: string;
  prazo: string;
};

type CotacaoStoreActions = {
  setView: (view: CotacaoView) => void;
  setStatus: (status: CotacaoStatus, error?: string | null) => void;
  setData: (payload: {
    fornecedores: Fornecedor[];
    precos: PrecosMap;
    config: CotacaoConfig | null;
  }) => void;
  setPrecos: (precos: PrecosMap) => void;
  setConfig: (config: CotacaoConfig) => void;
  requestReload: () => void;
  openFornModal: (forn?: Fornecedor) => void;
  closeFornModal: () => void;
  updateFornDraft: (patch: Partial<FornDraft>) => void;
  setImportContext: (ctx: ImportMapContext | null) => void;
  openImportMap: () => void;
  closeImportMap: () => void;
  setImportProgress: (pct: number, msg: string) => void;
  clearImportProgress: () => void;
  setImportResumo: (resumo: ImportResumo | null) => void;
};

const EMPTY_DRAFT: FornDraft = { nome: '', contato: '', prazo: '' };

export const useCotacaoStore = create<CotacaoStoreState & CotacaoStoreActions>((set) => ({
  view: 'importar',
  status: 'idle',
  error: null,
  fornecedores: [],
  precos: {},
  config: null,
  reloadVersion: 0,
  fornModal: { open: false, draft: EMPTY_DRAFT },
  importContext: null,
  importMapOpen: false,
  importProgress: null,
  importResumo: null,

  setView: (view) => set({ view }),
  setStatus: (status, error = null) => set({ status, error }),
  setData: ({ fornecedores, precos, config }) =>
    set({ fornecedores, precos, config, status: 'ready', error: null }),
  setPrecos: (precos) => set({ precos }),
  setConfig: (config) => set({ config }),
  requestReload: () => set((s) => ({ reloadVersion: s.reloadVersion + 1 })),
  openFornModal: (forn) =>
    set({
      fornModal: {
        open: true,
        draft: forn
          ? { nome: forn.nome, contato: forn.contato ?? '', prazo: forn.prazo ?? '' }
          : EMPTY_DRAFT
      }
    }),
  closeFornModal: () =>
    set((s) => ({ fornModal: { ...s.fornModal, open: false, draft: EMPTY_DRAFT } })),
  updateFornDraft: (patch) =>
    set((s) => ({ fornModal: { ...s.fornModal, draft: { ...s.fornModal.draft, ...patch } } })),
  setImportContext: (ctx) => set({ importContext: ctx }),
  openImportMap: () => set({ importMapOpen: true }),
  closeImportMap: () => set({ importMapOpen: false, importProgress: null }),
  setImportProgress: (pct, msg) => set({ importProgress: { pct, msg } }),
  clearImportProgress: () => set({ importProgress: null }),
  setImportResumo: (importResumo) => set({ importResumo })
}));
