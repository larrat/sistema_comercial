import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAccessToken, useAuthStore } from './useAuthStore';
import { getSupabaseConfig } from './supabaseConfig';
import type { AuthSession } from '../../types/domain';

vi.mock('./supabaseConfig', () => ({
  getSupabaseConfig: vi.fn()
}));

const getSupabaseConfigMock = vi.mocked(getSupabaseConfig);

function createSession(patch: Partial<AuthSession> = {}): AuthSession {
  return {
    access_token: 'token-1',
    refresh_token: 'refresh-1',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: null,
    ...patch
  };
}

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    useAuthStore.setState({ session: null, status: 'unknown' });
    getSupabaseConfigMock.mockReturnValue({
      url: 'https://example.supabase.co',
      key: 'public-key',
      ready: true
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  it('hydrate marca como nao autenticado quando nao houver sessao', async () => {
    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('hydrate reaproveita sessao ainda valida sem refresh', async () => {
    const session = createSession();
    localStorage.setItem('sc_auth_session_v1', JSON.stringify(session));

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().session?.access_token).toBe('token-1');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('hydrate faz refresh quando a sessao esta expirando', async () => {
    const session = createSession({
      access_token: 'old-token',
      expires_at: Math.floor(Date.now() / 1000) + 10
    });
    localStorage.setItem('sc_auth_session_v1', JSON.stringify(session));
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'token-refresh',
        refresh_token: 'refresh-2',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'u1' }
      })
    } as Response);

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().session?.access_token).toBe('token-refresh');
    expect(getAccessToken()).toBe('token-refresh');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('setSession persiste a sessao e clearSession remove a persistencia', () => {
    const session = createSession({ access_token: 'persistido' });

    useAuthStore.getState().setSession(session);
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(localStorage.getItem('sc_auth_session_v1')).toContain('persistido');

    useAuthStore.getState().clearSession();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().session).toBeNull();
    expect(localStorage.getItem('sc_auth_session_v1')).toBeNull();
  });
});
