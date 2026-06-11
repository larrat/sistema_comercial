import { Navigate, Outlet } from 'react-router-dom';

import { useRoleStore } from '../useRoleStore';
import { getDefaultAppPath } from './routes';

export function AdminOnlyRoute() {
  const hasPermission = useRoleStore(s => s.hasPermission);
  if (!hasPermission('admin:tudo')) return <Navigate to={getDefaultAppPath()} replace />;
  return <Outlet />;
}
