export const LEGACY_STORAGE_KEYS = {
  authSession: 'sc_auth_session_v1',
  filialId: 'sc_filial_id',
  supabaseUrl: 'sc_supabase_url',
  supabaseKey: 'sc_supabase_key'
} as const;

function getStorage(): Storage | null {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

export function readStorageString(key: string): string | null {
  try {
    return getStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorageString(key: string, value: string): void {
  try {
    getStorage()?.setItem(key, value);
  } catch {
    // noop
  }
}

export function removeStorageKey(key: string): void {
  try {
    getStorage()?.removeItem(key);
  } catch {
    // noop
  }
}

export function readStorageJson<T>(key: string): T | null {
  const raw = readStorageString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeStorageJson(key: string, value: unknown): void {
  writeStorageString(key, JSON.stringify(value));
}
