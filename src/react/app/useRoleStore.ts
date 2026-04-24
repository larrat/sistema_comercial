import { create } from 'zustand';

import type { AppUserRole } from './hooks/useCurrentUserRole';
import { LEGACY_STORAGE_KEYS, readStorageString, removeStorageKey, writeStorageString } from './legacy/storage';

const APP_ROLES: AppUserRole[] = ['operador', 'gerente', 'admin'];

function normalizeRole(raw: string | null): AppUserRole {
  const v = String(raw || '').trim().toLowerCase();
  return APP_ROLES.includes(v as AppUserRole) ? (v as AppUserRole) : 'operador';
}

export type RoleStoreState = {
  role: AppUserRole | null;
};

export type RoleStoreActions = {
  hydrate: () => void;
  setRole: (_role: string) => void;
  clearRole: () => void;
};

export const useRoleStore = create<RoleStoreState & RoleStoreActions>((set) => ({
  role: null,

  hydrate: () => {
    const raw = readStorageString(LEGACY_STORAGE_KEYS.userRole);
    set({ role: raw ? normalizeRole(raw) : null });
  },

  setRole: (role) => {
    const normalized = normalizeRole(role);
    writeStorageString(LEGACY_STORAGE_KEYS.userRole, normalized);
    set({ role: normalized });
  },

  clearRole: () => {
    removeStorageKey(LEGACY_STORAGE_KEYS.userRole);
    set({ role: null });
  }
}));
