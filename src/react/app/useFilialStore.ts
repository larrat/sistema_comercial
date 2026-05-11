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

export type FilialStoreState = {
  filialId: string | null;
};

export type FilialStoreActions = {
  hydrate: () => void;
  setFilial: (_filialId: string) => void;
  clearFilial: () => void;
};

export const useFilialStore = create<FilialStoreState & FilialStoreActions>((set) => ({
  filialId: null,

  hydrate: () => {
    set({ filialId: readFilialId() });
  },

  setFilial: (filialId) => {
    writeStorageString(STORAGE_KEYS.filialId, filialId);
    set({ filialId });
  },

  clearFilial: () => {
    removeStorageKey(STORAGE_KEYS.filialId);
    set({ filialId: null });
  }
}));
