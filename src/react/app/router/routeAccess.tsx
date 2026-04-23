import { Navigate, Outlet } from 'react-router-dom';

import { FilialProvider } from '../filial/FilialProvider';
import type { AppBootstrapState } from '../hooks/useAppBootstrap';
import { getDefaultAppPath } from './routes';

type RouteAccessProps = {
  bootstrap: AppBootstrapState;
};

function BootstrapLoading() {
  return (
    <div className="rf-shell-state">
      <div className="sk-card" style={{ width: 320 }}>
        <div className="sk-line" />
        <div className="sk-line" />
      </div>
    </div>
  );
}

export function LoginRouteAccess({ bootstrap }: RouteAccessProps) {
  if (bootstrap.status === 'unknown') return <BootstrapLoading />;
  if (bootstrap.status === 'authenticated_without_filial') {
    return <Navigate to="/setup" replace />;
  }
  if (bootstrap.status === 'authenticated_with_filial') {
    return <Navigate to={getDefaultAppPath()} replace />;
  }
  return <Outlet />;
}

export function SetupRouteAccess({ bootstrap }: RouteAccessProps) {
  if (bootstrap.status === 'unknown') return <BootstrapLoading />;
  if (bootstrap.status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }
  if (bootstrap.status === 'authenticated_with_filial') {
    return <Navigate to={getDefaultAppPath()} replace />;
  }
  return <Outlet />;
}

export function ProtectedAppRoute({ bootstrap }: RouteAccessProps) {
  if (bootstrap.status === 'unknown') return <BootstrapLoading />;
  if (bootstrap.status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }
  if (bootstrap.status === 'authenticated_without_filial') {
    return <Navigate to="/setup" replace />;
  }

  return (
    <FilialProvider filialId={bootstrap.filialId}>
      <Outlet />
    </FilialProvider>
  );
}
