import { createBrowserRouter, createRoutesFromElements, RouterProvider, Navigate, Route, Routes } from 'react-router-dom';
import { useMemo, lazy, Suspense } from 'react';

// Lazy loading for feature pages to reduce initial bundle size
const ClienteCreateRoutePage = lazy(() => import('../../features/clientes/pages/ClienteCreateRoutePage').then(m => ({ default: m.ClienteCreateRoutePage })));
const ClienteProfileRoutePage = lazy(() => import('../../features/clientes/pages/ClienteProfileRoutePage').then(m => ({ default: m.ClienteProfileRoutePage })));
const ClienteEditRoutePage = lazy(() => import('../../features/clientes/pages/ClienteEditRoutePage').then(m => ({ default: m.ClienteEditRoutePage })));
const ClientesRoutePage = lazy(() => import('../../features/clientes/pages/ClientesRoutePage').then(m => ({ default: m.ClientesRoutePage })));
const ContasReceberRoutePage = lazy(() => import('../../features/contas-receber/pages/ContasReceberRoutePage').then(m => ({ default: m.ContasReceberRoutePage })));
const DashboardRoutePage = lazy(() => import('../../features/dashboard/pages/DashboardRoutePage').then(m => ({ default: m.DashboardRoutePage })));
const CotacaoRoutePage = lazy(() => import('../../features/cotacao/pages/CotacaoRoutePage').then(m => ({ default: m.CotacaoRoutePage })));
const EstoqueRoutePage = lazy(() => import('../../features/estoque/pages/EstoqueRoutePage').then(m => ({ default: m.EstoqueRoutePage })));
const PedidoProfileRoutePage = lazy(() => import('../../features/pedidos/pages/PedidoProfileRoutePage').then(m => ({ default: m.PedidoProfileRoutePage })));
const PedidoCreateRoutePage = lazy(() => import('../../features/pedidos/pages/PedidoCreateRoutePage').then(m => ({ default: m.PedidoCreateRoutePage })));
const PedidoEditRoutePage = lazy(() => import('../../features/pedidos/pages/PedidoEditRoutePage').then(m => ({ default: m.PedidoEditRoutePage })));
const PedidosRoutePage = lazy(() => import('../../features/pedidos/pages/PedidosRoutePage').then(m => ({ default: m.PedidosRoutePage })));
const PdvRoutePage = lazy(() => import('../../features/pedidos/pages/PdvRoutePage').then(m => ({ default: m.PdvRoutePage })));
const ProdutoProfileRoutePage = lazy(() => import('../../features/produtos/pages/ProdutoProfileRoutePage').then(m => ({ default: m.ProdutoProfileRoutePage })));
const ProdutoCreateRoutePage = lazy(() => import("../../features/produtos/pages/ProdutoCreateRoutePage").then(m => ({ default: m.ProdutoCreateRoutePage })));
const ProdutosRoutePage = lazy(() => import('../../features/produtos/pages/ProdutosRoutePage').then(m => ({ default: m.ProdutosRoutePage })));
const RcasRoutePage = lazy(() => import('../../features/rcas/pages/RcasRoutePage').then(m => ({ default: m.RcasRoutePage })));
const RelatoriosRoutePage = lazy(() => import('../../features/relatorios/pages/RelatoriosRoutePage').then(m => ({ default: m.RelatoriosRoutePage })));
const CampanhasRoutePage = lazy(() => import('../../features/campanhas/pages/CampanhasRoutePage').then(m => ({ default: m.CampanhasRoutePage })));
const AnalyticsPage = lazy(() => import('../../features/analytics/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const CrmPage = lazy(() => import('../../features/crm/components/CrmPage').then(m => ({ default: m.CrmPage })));
const AgendaPage = lazy(() => import('../../features/agenda/components/AgendaPage').then(m => ({ default: m.AgendaPage })));
const ContratosPage = lazy(() => import('../../features/contratos/components/ContratosPage').then(m => ({ default: m.ContratosPage })));
const ContratoProfilePage = lazy(() => import('../../features/contratos/components/ContratoProfilePage').then(m => ({ default: m.ContratoProfilePage })));
const FiliaisRoutePage = lazy(() => import('../../features/filiais/pages/FiliaisRoutePage').then(m => ({ default: m.FiliaisRoutePage })));
const AcessosRoutePage = lazy(() => import('../../features/acessos/pages/AcessosRoutePage').then(m => ({ default: m.AcessosRoutePage })));
const ComprasRoutePage = lazy(() => import('../../features/compras/pages/ComprasRoutePage').then(m => ({ default: m.ComprasRoutePage })));
const CaixaRoutePage = lazy(() => import('../../features/caixa/pages/CaixaRoutePage').then(m => ({ default: m.CaixaRoutePage })));
const ConciliacaoBancariaRoutePage = lazy(() => import('../../features/caixa/pages/ConciliacaoBancariaRoutePage').then(m => ({ default: m.ConciliacaoBancariaRoutePage })));
const SugestaoComprasRoutePage = lazy(() => import('../../features/compras/pages/SugestaoComprasRoutePage').then(m => ({ default: m.SugestaoComprasRoutePage })));
const PedidoCompraCreateRoutePage = lazy(() => import('../../features/compras/pages/PedidoCompraCreateRoutePage').then(m => ({ default: m.PedidoCompraCreateRoutePage })));
const LoginPage = lazy(() => import('../../features/auth/components/LoginPage').then(m => ({ default: m.LoginPage })));
const SetupPage = lazy(() => import('../../features/setup/components/SetupPage').then(m => ({ default: m.SetupPage })));
const PortalStorefrontPage = lazy(() => import('../../features/portal/pages/PortalStorefrontPage').then(m => ({ default: m.PortalStorefrontPage })));

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
  const router = useMemo(() => createBrowserRouter(
    createRoutesFromElements(
      <>
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
            <Route path="clientes/:clienteId/editar" element={<ClienteEditRoutePage />} />
            <Route path="estoque" element={<EstoqueRoutePage />} />
            <Route path="cotacao" element={<CotacaoRoutePage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="crm" element={<CrmPage />} />
            <Route path="contratos" element={<ContratosPage />} />
            <Route path="contratos/:id" element={<ContratoProfilePage />} />
            <Route path="pedidos" element={<PedidosRoutePage />} />
            <Route path="pedidos/novo" element={<PedidoCreateRoutePage />} />
            <Route path="pedidos/:pedidoId" element={<PedidoProfileRoutePage />} />
            <Route path="pedidos/:pedidoId/editar" element={<PedidoEditRoutePage />} />
            <Route path="receber" element={<ContasReceberRoutePage />} />
            <Route path="produtos" element={<ProdutosRoutePage />} />
            <Route path="produtos/novo" element={<ProdutoCreateRoutePage />} />
            <Route path="produtos/:produtoId" element={<ProdutoProfileRoutePage />} />
            <Route path="rcas" element={<RcasRoutePage />} />
            <Route path="relatorios" element={<RelatoriosRoutePage />} />
            <Route path="campanhas" element={<CampanhasRoutePage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="compras" element={<ComprasRoutePage />} />
            <Route path="compras/novo" element={<PedidoCompraCreateRoutePage />} />
            <Route path="compras/sugestoes" element={<SugestaoComprasRoutePage />} />
            <Route path="caixa" element={<CaixaRoutePage />} />
            <Route path="caixa/conciliacao" element={<ConciliacaoBancariaRoutePage />} />
            <Route element={<AdminOnlyRoute />}>
              <Route path="filiais" element={<FiliaisRoutePage />} />
              <Route path="acessos" element={<AcessosRoutePage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/portal" element={<PortalStorefrontPage />} />

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
      </>
    )
  ), [bootstrap.status, bootstrap.filialId, bootstrap.user?.id]);

  return (
    <Suspense fallback={<RouteLoader />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
