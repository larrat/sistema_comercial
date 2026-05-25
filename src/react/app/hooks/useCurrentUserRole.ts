import { useRoleStore } from '../useRoleStore';

export type AppUserRole = 'admin' | 'gerente' | 'operador';

export function useCurrentUserRole(): AppUserRole {
  const role = useRoleStore((s) => s.role);
  return role ?? 'operador';
}
