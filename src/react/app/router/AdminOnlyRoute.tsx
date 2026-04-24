import { Navigate, Outlet } from 'react-router-dom';

import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { getDefaultAppPath } from './routes';

export function AdminOnlyRoute() {
  const role = useCurrentUserRole();
  if (role !== 'admin') return <Navigate to={getDefaultAppPath()} replace />;
  return <Outlet />;
}
