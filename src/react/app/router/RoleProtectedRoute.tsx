import { Navigate, Outlet } from 'react-router-dom';
import { useCurrentUserRole, type AppUserRole } from '../hooks/useCurrentUserRole';
import { getDefaultAppPath } from './paths';

type RoleProtectedRouteProps = {
  allowedRoles: AppUserRole[];
};

export function RoleProtectedRoute({ allowedRoles }: RoleProtectedRouteProps) {
  const role = useCurrentUserRole();

  if (!allowedRoles.includes(role)) {
    return <Navigate to={getDefaultAppPath()} replace />;
  }

  return <Outlet />;
}
