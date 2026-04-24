import { useRoleStore } from '../useRoleStore';

export type AppUserRole = 'operador' | 'gerente' | 'admin';

export function useCurrentUserRole(): AppUserRole {
  const role = useRoleStore((s) => s.role);
  return role ?? 'operador';
}
