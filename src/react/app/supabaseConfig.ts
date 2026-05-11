/**
 * Lê a configuração do Supabase a partir de variáveis injetadas pelo index.html
 * (window.__SC_SUPABASE_URL__ / window.__SC_SUPABASE_KEY__) ou do localStorage,
 * com fallback para os valores de produção hardcoded.
 */

import { STORAGE_KEYS, readStorageString } from './lib/storage';

const DEFAULT_URL = 'https://eiycrokqwhmfmjackjni.supabase.co';
const DEFAULT_KEY = 'sb_publishable_Hc1MlzrIX9c79PEHiylpTA_9787bYHJ';

function resolveUrl(): string {
  if (typeof window !== 'undefined' && typeof window.__SC_SUPABASE_URL__ === 'string' && window.__SC_SUPABASE_URL__)
    return window.__SC_SUPABASE_URL__;
  const fromStorage = readStorageString(STORAGE_KEYS.supabaseUrl);
  if (fromStorage) return fromStorage;
  return DEFAULT_URL;
}

function resolveKey(): string {
  if (typeof window !== 'undefined' && typeof window.__SC_SUPABASE_KEY__ === 'string' && window.__SC_SUPABASE_KEY__)
    return window.__SC_SUPABASE_KEY__;
  const fromStorage = readStorageString(STORAGE_KEYS.supabaseKey);
  if (fromStorage) return fromStorage;
  return DEFAULT_KEY;
}

export type SupabaseConfig = {
  url: string;
  key: string;
  ready: boolean;
};

export function getSupabaseConfig(): SupabaseConfig {
  const url = resolveUrl();
  const key = resolveKey();
  return { url, key, ready: !!(url && key) };
}
