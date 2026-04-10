import { beforeEach, describe, expect, it } from 'vitest';

import { getSupabaseConfig } from './supabaseConfig';

describe('getSupabaseConfig', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.__SC_SUPABASE_URL__;
    delete window.__SC_SUPABASE_KEY__;
    delete window.__SC_ALLOW_LEGACY_SUPABASE_DEFAULTS__;
  });

  it('prioriza configuracao injetada em window', () => {
    window.__SC_SUPABASE_URL__ = 'https://window.example';
    window.__SC_SUPABASE_KEY__ = 'window-key';
    localStorage.setItem('sc_supabase_url', 'https://storage.example');
    localStorage.setItem('sc_supabase_key', 'storage-key');

    expect(getSupabaseConfig()).toEqual({
      url: 'https://window.example',
      key: 'window-key',
      ready: true
    });
  });

  it('usa localStorage quando window nao estiver preenchido', () => {
    localStorage.setItem('sc_supabase_url', 'https://storage.example');
    localStorage.setItem('sc_supabase_key', 'storage-key');

    expect(getSupabaseConfig()).toEqual({
      url: 'https://storage.example',
      key: 'storage-key',
      ready: true
    });
  });

  it('libera fallback legado apenas quando flag estiver ativa', () => {
    window.__SC_ALLOW_LEGACY_SUPABASE_DEFAULTS__ = true;

    const config = getSupabaseConfig();

    expect(config.ready).toBe(true);
    expect(config.url).toContain('supabase.co');
    expect(config.key).toContain('sb_publishable_');
  });

  it('retorna ready=false quando nenhuma fonte estiver disponivel', () => {
    expect(getSupabaseConfig()).toEqual({
      url: '',
      key: '',
      ready: false
    });
  });
});
