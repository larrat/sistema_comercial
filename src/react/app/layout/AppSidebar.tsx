import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  Circle,
  DollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  TrendingUp,
  UserCheck,
  Users,
  type LucideIcon
} from 'lucide-react';

import { FilialSwitcher } from '../filial/FilialSwitcher';
import { useAuthStore } from '../useAuthStore';
import { useFilialStore } from '../useFilialStore';
import { useRoleStore } from '../useRoleStore';
import { useNavigationItems } from '../hooks/useNavigationItems';

const SIDEBAR_COLLAPSED_KEY = 'app-sidebar-collapsed';

const iconByPath: Record<string, LucideIcon> = {
  '/app/pdv': ShoppingCart,
  '/app/dashboard': LayoutDashboard,
  '/app/estoque': Package,
  '/app/cotacao': FileText,
  '/app/relatorios': BarChart3,
  '/app/campanhas': Megaphone,
  '/app/analytics': TrendingUp,
  '/app/clientes': Users,
  '/app/produtos': Tag,
  '/app/rcas': UserCheck,
  '/app/pedidos': ShoppingBag,
  '/app/receber': DollarSign,
  '/app/filiais': Building2,
  '/app/acessos': Shield
};

export function AppSidebar() {
  const groups = useNavigationItems();
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearFilial = useFilialStore((s) => s.clearFilial);
  const clearRole = useRoleStore((s) => s.clearRole);
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  });

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  function handleLogout() {
    clearFilial();
    clearRole();
    clearSession();
    navigate('/login', { replace: true });
  }

  function toggleCollapsed() {
    setCollapsed((current) => !current);
  }

  return (
    <aside
      className={`flex flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 z-40 relative shadow-2xl shadow-slate-900/20 ${
        collapsed ? 'w-16' : 'w-[260px]'
      }`}
      aria-label="Navegação principal"
    >
      <div className="flex-shrink-0 p-4 border-b border-slate-800/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden" aria-hidden={collapsed}>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white flex-shrink-0 shadow-sm shadow-blue-900/50">
              <Store size={18} strokeWidth={2} />
            </div>
            {!collapsed && (
              <div className="font-space font-bold text-base text-slate-100 tracking-tight whitespace-nowrap">
                Sistema Comercial
              </div>
            )}
          </div>
          <button
            type="button"
            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          >
            {collapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      <div className="p-3">
        <FilialSwitcher />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            {collapsed ? (
              <div className="h-px bg-slate-800 my-2 mx-1 opacity-60" aria-hidden="true" />
            ) : (
              <div className="px-2 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {group.label}
              </div>
            )}

            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const Icon = iconByPath[item.path] ?? Circle;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border border-transparent ${
                        isActive
                          ? 'bg-blue-600/10 text-blue-400 font-medium border-blue-600/20 shadow-sm'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={18} strokeWidth={2} className="flex-shrink-0" />
                    {!collapsed && <span className="truncate whitespace-nowrap text-sm">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 p-3 mt-auto border-t border-slate-800/80">
        <button
          type="button"
          className="flex items-center justify-center w-full gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          onClick={handleLogout}
          title={collapsed ? 'Sair' : undefined}
        >
          {collapsed ? <LogOut size={18} strokeWidth={2} /> : (
            <>
              <LogOut size={16} strokeWidth={2} />
              <span className="font-medium">Sair da Conta</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
