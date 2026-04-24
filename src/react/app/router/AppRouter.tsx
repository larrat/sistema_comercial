import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import type { AppBootstrapState } from '../hooks/useAppBootstrap';
import { ClientesRoutePage } from '../../features/clientes/pages/ClientesRoutePage';
import { ContasReceberRoutePage } from '../../features/contas-receber/pages/ContasReceberRoutePage';
import { DashboardRoutePage } from '../../features/dashboard/pages/DashboardRoutePage';
import { CotacaoRoutePage } from '../../features/cotacao/pages/CotacaoRoutePage';
import { EstoqueRoutePage } from '../../features/estoque/pages/EstoqueRoutePage';
import { PedidosRoutePage } from '../../features/pedidos/pages/PedidosRoutePage';
import { ProdutosRoutePage } from '../../features/produtos/pages/ProdutosRoutePage';
import { RcasRoutePage } from '../../features/rcas/pages/RcasRoutePage';
import { RelatoriosRoutePage } from '../../features/relatorios/pages/RelatoriosRoutePage';
import { CampanhasRoutePage } from '../../features/campanhas/pages/CampanhasRoutePage';
import { LoginPage } from '../../features/auth/components/LoginPage';
import { SetupPage } from '../../features/setup/components/SetupPage';
import { FiliaisRoutePage } from '../../features/filiais/pages/FiliaisRoutePage';
import { AcessosRoutePage } from '../../features/acessos/pages/AcessosRoutePage';
import { AppShell } from '../layout/AppShell';
import { AdminOnlyRoute } from './AdminOnlyRoute';
import { LoginRouteAccess, ProtectedAppRoute, SetupRouteAccess } from './routeAccess';
import { getDefaultAppPath } from './routes';

type AppRouterProps = {
  bootstrap: AppBootstrapState;
};

function AppRootRedirect() {
  return <Navigate to={getDefaultAppPath()} replace />;
}

export function AppRouter({ bootstrap }: AppRouterProps) {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<LoginRouteAccess bootstrap={bootstrap} />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<SetupRouteAccess bootstrap={bootstrap} />}>
          <Route path="/setup" element={<SetupPage />} />
        </Route>

        <Route element={<ProtectedAppRoute bootstrap={bootstrap} />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<AppRootRedirect />} />
            <Route path="dashboard" element={<DashboardRoutePage />} />
            <Route path="clientes" element={<ClientesRoutePage />} />
            <Route path="estoque" element={<EstoqueRoutePage />} />
            <Route path="cotacao" element={<CotacaoRoutePage />} />
            <Route path="pedidos" element={<PedidosRoutePage />} />
            <Route path="receber" element={<ContasReceberRoutePage />} />
            <Route path="produtos" element={<ProdutosRoutePage />} />
            <Route path="rcas" element={<RcasRoutePage />} />
            <Route path="relatorios" element={<RelatoriosRoutePage />} />
            <Route path="campanhas" element={<CampanhasRoutePage />} />
            <Route element={<AdminOnlyRoute />}>
              <Route path="filiais" element={<FiliaisRoutePage />} />
              <Route path="acessos" element={<AcessosRoutePage />} />
            </Route>
          </Route>
        </Route>

        <Route
          path="/"
          element={
            bootstrap.status === 'authenticated_with_filial' ? (
              <Navigate to={getDefaultAppPath()} replace />
            ) : bootstrap.status === 'authenticated_without_filial' ? (
              <Navigate to="/setup" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
