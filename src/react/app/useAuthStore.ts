/**
 * Store de autenticação React — compartilha sessão com o legado.
 *
 * Usa a mesma chave de localStorage (sc_auth_session_v1) que o legado,
 * de modo que login/logout em qualquer lado reflete no outro sem re-bootstrap.
 */

import { create } from 'zustand';
import type { AuthSession } from '../../types/domain';
import { LEGACY_STORAGE_KEYS, readStorageJson, removeStorageKey, writeStorageJson } from './legacy/storage';
import { getSupabaseConfig } from './supabaseConfig';

function readSession(): AuthSession | null {
  return readStorageJson<AuthSession>(LEGACY_STORAGE_KEYS.authSession);
}

function writeSession(session: AuthSession | null): void {
  if (!session) {
    removeStorageKey(LEGACY_STORAGE_KEYS.authSession);
  } else {
    writeStorageJson(LEGACY_STORAGE_KEYS.authSession, session);
  }
}

async function refreshSession(current: AuthSession): Promise<AuthSession | null> {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !current.refresh_token) return null;
  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: current.refresh_token })
    });
    if (!res.ok) {
      writeSession(null);
      return null;
    }
    const raw = await res.json();
    if (!raw?.access_token) {
      writeSession(null);
      return null;
    }
    const next: AuthSession = {
      access_token: raw.access_token,
      refresh_token: raw.refresh_token || '',
      token_type: raw.token_type || 'bearer',
      expires_in: Number(raw.expires_in || 3600),
      expires_at: Number(raw.expires_at || 0) || Math.floor(Date.now() / 1000) + 3600,
      user: raw.user ?? null
    };
    writeSession(next);
    return next;
  } catch {
    return null;
  }
}

export type AuthStoreState = {
  session: AuthSession | null;
  /** 'unknown' antes de checar; 'authenticated' ou 'unauthenticated' depois */
  status: 'unknown' | 'authenticated' | 'unauthenticated';
};

export type AuthStoreActions = {
  /** Lê sessão do storage e refresca se necessário. Deve ser chamado no boot. */
  hydrate: () => Promise<void>;
  setSession: (_session: AuthSession | null) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthStoreState & AuthStoreActions>((set) => ({
  session: null,
  status: 'unknown',

  hydrate: async () => {
    const stored = readSession();
    if (!stored?.access_token) {
      set({ session: null, status: 'unauthenticated' });
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    if (Number(stored.expires_at || 0) > now + 45) {
      set({ session: stored, status: 'authenticated' });
      return;
    }
    const refreshed = await refreshSession(stored);
    set({
      session: refreshed,
      status: refreshed ? 'authenticated' : 'unauthenticated'
    });
  },

  setSession: (session) => {
    writeSession(session);
    set({ session, status: session ? 'authenticated' : 'unauthenticated' });
  },

  clearSession: () => {
    writeSession(null);
    set({ session: null, status: 'unauthenticated' });
  }
}));

/** Retorna o bearer token atual — `null` se não autenticado */
export function getAccessToken(): string | null {
  return useAuthStore.getState().session?.access_token ?? null;
}
