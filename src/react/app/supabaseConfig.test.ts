import { beforeEach, describe, expect, it } from 'vitest';

import { getSupabaseConfig } from './supabaseConfig';

describe('getSupabaseConfig', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.__SC_SUPABASE_URL__;
    delete window.__SC_SUPABASE_KEY__;
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

  it('retorna fallback hardcoded quando nenhuma fonte estiver disponivel', () => {
    const config = getSupabaseConfig();

    // A configuração sempre retorna ready=true pois há fallback hardcoded de produção.
    expect(config.ready).toBe(true);
    expect(config.url).toContain('supabase.co');
    expect(config.key.length).toBeGreaterThan(10);
  });

  it('prioriza window sobre localStorage sobre fallback', () => {
    window.__SC_SUPABASE_URL__ = 'https://win.example';
    window.__SC_SUPABASE_KEY__ = 'win-key';

    const config = getSupabaseConfig();
    expect(config.url).toBe('https://win.example');
    expect(config.key).toBe('win-key');
    expect(config.ready).toBe(true);
  });
});
