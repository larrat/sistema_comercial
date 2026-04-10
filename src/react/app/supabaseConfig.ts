/**
 * Lê a configuração do Supabase das mesmas fontes que o legado usa:
 *   1. window.__SC_SUPABASE_URL__ / window.__SC_SUPABASE_KEY__
 *   2. localStorage sc_supabase_url / sc_supabase_key
 *   3. defaults legados (opt-in via window.__SC_ALLOW_LEGACY_SUPABASE_DEFAULTS__)
 *
 * Isso garante que React e legado compartilhem a mesma config sem duplicar
 * a lógica de bootstrap.
 */

declare global {
  interface Window {
    __SC_SUPABASE_URL__?: string;
    __SC_SUPABASE_KEY__?: string;
    __SC_ALLOW_LEGACY_SUPABASE_DEFAULTS__?: boolean;
  }
}

const LEGACY_URL = 'https://eiycrokqwhmfmjackjni.supabase.co';
const LEGACY_KEY = 'sb_publishable_Hc1MlzrIX9c79PEHiylpTA_9787bYHJ';

function resolve(windowKey: string, storageKey: string, legacyValue: string): string {
  const fromWindow = (window as Record<string, unknown>)[windowKey];
  if (typeof fromWindow === 'string' && fromWindow) return fromWindow;
  const fromStorage = localStorage.getItem(storageKey);
  if (fromStorage) return fromStorage;
  if (window.__SC_ALLOW_LEGACY_SUPABASE_DEFAULTS__) return legacyValue;
  return '';
}

export type SupabaseConfig = {
  url: string;
  key: string;
  ready: boolean;
};

export function getSupabaseConfig(): SupabaseConfig {
  const url = resolve('__SC_SUPABASE_URL__', 'sc_supabase_url', LEGACY_URL);
  const key = resolve('__SC_SUPABASE_KEY__', 'sc_supabase_key', LEGACY_KEY);
  return { url, key, ready: !!(url && key) };
}
