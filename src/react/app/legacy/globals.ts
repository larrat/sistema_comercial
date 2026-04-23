import type { AuthSession } from '../../../types/domain';

declare global {
  interface Window {
    __SC_SUPABASE_URL__?: string;
    __SC_SUPABASE_KEY__?: string;
    __SC_ALLOW_LEGACY_SUPABASE_DEFAULTS__?: boolean;
    __SC_AUTH_SESSION__?: AuthSession;
    __SC_FILIAL_ID__?: string;
    __SC_USER_ROLE__?: string;
  }
}

function readWindowValue<T>(key: keyof Window): T | null {
  if (typeof window === 'undefined') return null;
  const value = window[key] as T | undefined;
  return value ?? null;
}

export function getLegacyAuthSessionGlobal(): AuthSession | null {
  return readWindowValue<AuthSession>('__SC_AUTH_SESSION__');
}

export function getLegacyFilialIdGlobal(): string | null {
  const value = readWindowValue<string>('__SC_FILIAL_ID__');
  return typeof value === 'string' && value ? value : null;
}

export function getLegacyUserRoleGlobal(): string | null {
  const value = readWindowValue<string>('__SC_USER_ROLE__');
  return typeof value === 'string' && value ? value : null;
}

export function getLegacySupabaseWindowUrl(): string | null {
  const value = readWindowValue<string>('__SC_SUPABASE_URL__');
  return typeof value === 'string' && value ? value : null;
}

export function getLegacySupabaseWindowKey(): string | null {
  const value = readWindowValue<string>('__SC_SUPABASE_KEY__');
  return typeof value === 'string' && value ? value : null;
}

export function allowLegacySupabaseDefaults(): boolean {
  return readWindowValue<boolean>('__SC_ALLOW_LEGACY_SUPABASE_DEFAULTS__') === true;
}
