/**
 * Lê a configuração do Supabase das mesmas fontes que o legado usa.
 * A compatibilidade fica centralizada em adapters explícitos de globals/storage.
 */

import {
  allowLegacySupabaseDefaults,
  getLegacySupabaseWindowKey,
  getLegacySupabaseWindowUrl
} from './legacy/globals';
import { LEGACY_STORAGE_KEYS, readStorageString } from './legacy/storage';

const LEGACY_URL = 'https://eiycrokqwhmfmjackjni.supabase.co';
const LEGACY_KEY = 'sb_publishable_Hc1MlzrIX9c79PEHiylpTA_9787bYHJ';

function resolve(fromWindow: string | null, storageKey: string, legacyValue: string): string {
  if (fromWindow) return fromWindow;
  const fromStorage = readStorageString(storageKey);
  if (fromStorage) return fromStorage;
  if (allowLegacySupabaseDefaults()) return legacyValue;
  return '';
}

export type SupabaseConfig = {
  url: string;
  key: string;
  ready: boolean;
};

export function getSupabaseConfig(): SupabaseConfig {
  const url = resolve(getLegacySupabaseWindowUrl(), LEGACY_STORAGE_KEYS.supabaseUrl, LEGACY_URL);
  const key = resolve(getLegacySupabaseWindowKey(), LEGACY_STORAGE_KEYS.supabaseKey, LEGACY_KEY);
  return { url, key, ready: !!(url && key) };
}
