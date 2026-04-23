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
import { AppContent } from '../layout/AppContent';
import { AppShell } from '../layout/AppShell';
import { LoginRouteAccess, ProtectedAppRoute, SetupRouteAccess } from './routeAccess';
import { getDefaultAppPath } from './routes';

type AppRouterProps = {
  bootstrap: AppBootstrapState;
};

function LoginPage() {
  return (
    <AppContent
      kicker="Acesso"
      title="Login"
      description="O login real ainda é fornecido pelo sistema principal. Esta rota já existe para receber o fluxo da nova árvore React."
    />
  );
}

function SetupPage() {
  return (
    <AppContent
      kicker="Configuração"
      title="Setup"
      description="A seleção e criação de filial ainda dependem do fluxo legado. Esta rota já representa o estado autenticado sem filial."
    />
  );
}

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

        <Route path="/react.html" element={<Navigate to="/" replace />} />
        <Route path="/react.html/*" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
