/**
 * Store de filial ativa React — sincroniza com o legado.
 *
 * O legado persiste a filial escolhida em localStorage (sc_filial_id).
 * Este store lê e escreve na mesma chave para manter coerência.
 */

import { create } from 'zustand';
import { LEGACY_STORAGE_KEYS, readStorageString, removeStorageKey, writeStorageString } from './legacy/storage';

function readFilialId(): string | null {
  return readStorageString(LEGACY_STORAGE_KEYS.filialId);
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
    writeStorageString(LEGACY_STORAGE_KEYS.filialId, filialId);
    set({ filialId });
  },

  clearFilial: () => {
    removeStorageKey(LEGACY_STORAGE_KEYS.filialId);
    set({ filialId: null });
  }
}));
