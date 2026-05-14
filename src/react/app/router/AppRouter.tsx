import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import type { AppBootstrapState } from '../hooks/useAppBootstrap';

// Lazy loading for feature pages to reduce initial bundle size
const ClienteCreateRoutePage = lazy(() => import('../../features/clientes/pages/ClienteCreateRoutePage').then(m => ({ default: m.ClienteCreateRoutePage })));
const ClienteProfileRoutePage = lazy(() => import('../../features/clientes/pages/ClienteProfileRoutePage').then(m => ({ default: m.ClienteProfileRoutePage })));
const ClientesRoutePage = lazy(() => import('../../features/clientes/pages/ClientesRoutePage').then(m => ({ default: m.ClientesRoutePage })));
const ContasReceberRoutePage = lazy(() => import('../../features/contas-receber/pages/ContasReceberRoutePage').then(m => ({ default: m.ContasReceberRoutePage })));
const DashboardRoutePage = lazy(() => import('../../features/dashboard/pages/DashboardRoutePage').then(m => ({ default: m.DashboardRoutePage })));
const CotacaoRoutePage = lazy(() => import('../../features/cotacao/pages/CotacaoRoutePage').then(m => ({ default: m.CotacaoRoutePage })));
const EstoqueRoutePage = lazy(() => import('../../features/estoque/pages/EstoqueRoutePage').then(m => ({ default: m.EstoqueRoutePage })));
const PedidoProfileRoutePage = lazy(() => import('../../features/pedidos/pages/PedidoProfileRoutePage').then(m => ({ default: m.PedidoProfileRoutePage })));
const PedidosRoutePage = lazy(() => import('../../features/pedidos/pages/PedidosRoutePage').then(m => ({ default: m.PedidosRoutePage })));
const PdvRoutePage = lazy(() => import('../../features/pedidos/pages/PdvRoutePage').then(m => ({ default: m.PdvRoutePage })));
const ProdutoProfileRoutePage = lazy(() => import('../../features/produtos/pages/ProdutoProfileRoutePage').then(m => ({ default: m.ProdutoProfileRoutePage })));
const ProdutosRoutePage = lazy(() => import('../../features/produtos/pages/ProdutosRoutePage').then(m => ({ default: m.ProdutosRoutePage })));
const RcasRoutePage = lazy(() => import('../../features/rcas/pages/RcasRoutePage').then(m => ({ default: m.RcasRoutePage })));
const RelatoriosRoutePage = lazy(() => import('../../features/relatorios/pages/RelatoriosRoutePage').then(m => ({ default: m.RelatoriosRoutePage })));
const CampanhasRoutePage = lazy(() => import('../../features/campanhas/pages/CampanhasRoutePage').then(m => ({ default: m.CampanhasRoutePage })));
const AnalyticsPage = lazy(() => import('../../features/analytics/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const FiliaisRoutePage = lazy(() => import('../../features/filiais/pages/FiliaisRoutePage').then(m => ({ default: m.FiliaisRoutePage })));
const AcessosRoutePage = lazy(() => import('../../features/acessos/pages/AcessosRoutePage').then(m => ({ default: m.AcessosRoutePage })));
const ComprasRoutePage = lazy(() => import('../../features/compras/pages/ComprasRoutePage').then(m => ({ default: m.ComprasRoutePage })));
const CaixaRoutePage = lazy(() => import('../../features/caixa/pages/CaixaRoutePage').then(m => ({ default: m.CaixaRoutePage })));
const LoginPage = lazy(() => import('../../features/auth/components/LoginPage').then(m => ({ default: m.LoginPage })));
const SetupPage = lazy(() => import('../../features/setup/components/SetupPage').then(m => ({ default: m.SetupPage })));

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

// Global Loading State for Route Suspense
function RouteLoader() {
  return (
    <div className="h-screen w-screen bg-[#020617] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <span className="text-cyan-500 font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">Sincronizando Nexus...</span>
      </div>
    </div>
  );
}

export function AppRouter({ bootstrap }: AppRouterProps) {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoader />}>
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
              <Route path="pdv" element={<PdvRoutePage />} />
              <Route path="dashboard" element={<DashboardRoutePage />} />
              <Route path="clientes" element={<ClientesRoutePage />} />
              <Route path="clientes/novo" element={<ClienteCreateRoutePage />} />
              <Route path="clientes/:clienteId" element={<ClienteProfileRoutePage />} />
              <Route path="estoque" element={<EstoqueRoutePage />} />
              <Route path="cotacao" element={<CotacaoRoutePage />} />
              <Route path="pedidos" element={<PedidosRoutePage />} />
              <Route path="pedidos/:pedidoId" element={<PedidoProfileRoutePage />} />
              <Route path="receber" element={<ContasReceberRoutePage />} />
              <Route path="produtos" element={<ProdutosRoutePage />} />
              <Route path="produtos/:produtoId" element={<ProdutoProfileRoutePage />} />
              <Route path="rcas" element={<RcasRoutePage />} />
              <Route path="relatorios" element={<RelatoriosRoutePage />} />
              <Route path="campanhas" element={<CampanhasRoutePage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="compras" element={<ComprasRoutePage />} />
              <Route path="caixa" element={<CaixaRoutePage />} />
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
      </Suspense>
    </BrowserRouter>
  );
}
