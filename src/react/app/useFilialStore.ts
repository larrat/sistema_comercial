/**
 * Store de filial ativa React.
 *
 * Persiste a filial escolhida em localStorage (sc_filial_id).
 */

import { create } from 'zustand';
import { STORAGE_KEYS, readStorageString, removeStorageKey, writeStorageString } from './lib/storage';

function readFilialId(): string | null {
  return readStorageString(STORAGE_KEYS.filialId);
}

export type FilialContext = {
  filial_id: string;
  cargo_id: string;
  permissoes: string[];
};

export type FilialStoreState = {
  filialId: string | null;
  filiaisPermitidas: FilialContext[];
};

export type FilialStoreActions = {
  hydrate: () => void;
  setFilial: (_filialId: string) => void;
  setFiliaisPermitidas: (_filiais: FilialContext[]) => void;
  clearFilial: () => void;
};

export const useFilialStore = create<FilialStoreState & FilialStoreActions>((set) => ({
  filialId: null,
  filiaisPermitidas: [],

  hydrate: () => {
    set({ filialId: readFilialId() });
  },

  setFilial: (filialId) => {
    writeStorageString(STORAGE_KEYS.filialId, filialId);
    set({ filialId });
  },

  setFiliaisPermitidas: (filiais) => {
    set({ filiaisPermitidas: filiais });
  },

  clearFilial: () => {
    removeStorageKey(STORAGE_KEYS.filialId);
    set({ filialId: null, filiaisPermitidas: [] });
  }
}));
