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
      className={`flex flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 z-40 relative shadow-2xl ${
        collapsed ? 'w-20' : 'w-[280px]'
      }`}
      aria-label="Navegação principal"
    >
      <div className="flex-shrink-0 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 shrink-0">
              <Store size={22} strokeWidth={2} />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-base text-slate-100 tracking-tight leading-none">Sistema</span>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.2em] mt-1">Comercial</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-100 transition-all group"
              onClick={toggleCollapsed}
            >
              <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {collapsed && (
        <div className="flex justify-center pb-6">
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-all shadow-inner"
            onClick={toggleCollapsed}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}



      <nav className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-8 scrollbar-hide">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            {!collapsed && (
              <div className="px-3 mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-600">
                {group.label}
              </div>
            )}
            {collapsed && <div className="h-px bg-slate-800/50 mx-2 mb-2" />}

            <div className="flex flex-col gap-1.5">
              {group.items.map((item) => {
                const Icon = iconByPath[item.path] ?? Circle;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 relative group
                      ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600/15 to-indigo-600/5 text-blue-400 font-bold shadow-sm'
                          : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/40'
                      }`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon 
                          size={collapsed ? 22 : 18} 
                          strokeWidth={isActive ? 2.5 : 2} 
                          className={`flex-shrink-0 transition-transform ${!isActive && 'group-hover:scale-110'}`} 
                        />
                        {!collapsed && <span className="truncate text-sm">{item.label}</span>}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 p-4 mt-auto border-t border-slate-800/50">
        <button
          type="button"
          className="flex items-center justify-center w-full gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all group active:scale-95"
          onClick={handleLogout}
        >
          <LogOut size={collapsed ? 22 : 18} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
          {!collapsed && <span>Sair da Conta</span>}
        </button>
      </div>
    </aside>
  );
}
