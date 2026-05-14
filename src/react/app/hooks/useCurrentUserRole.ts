import { useRoleStore } from '../useRoleStore';

export type AppUserRole = 'vendedor' | 'estoque' | 'admin';

export function useCurrentUserRole(): AppUserRole {
  const role = useRoleStore((s) => s.role);
  return role ?? 'vendedor';
}
