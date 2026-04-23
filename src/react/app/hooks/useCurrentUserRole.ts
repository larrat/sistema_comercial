import { useMemo } from 'react';
import { getLegacyUserRoleGlobal } from '../legacy/globals';

export type AppUserRole = 'operador' | 'gerente' | 'admin';

const APP_ROLES: AppUserRole[] = ['operador', 'gerente', 'admin'];

export function normalizeUserRole(role: unknown): AppUserRole {
  const normalized = String(role || '').trim().toLowerCase();
  return APP_ROLES.includes(normalized as AppUserRole) ? (normalized as AppUserRole) : 'operador';
}

export function useCurrentUserRole(): AppUserRole {
  return useMemo(() => normalizeUserRole(getLegacyUserRoleGlobal()), []);
}
