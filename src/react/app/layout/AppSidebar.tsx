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
        collapsed ? 'w-[72px]' : 'w-[280px]'
      }`}
      aria-label="Navegação principal"
    >
      <div className={`flex-shrink-0 flex items-center h-[88px] ${collapsed ? 'justify-center' : 'px-6 justify-between'}`}>
        <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg shrink-0">
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
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-100 transition-all group shrink-0"
            onClick={toggleCollapsed}
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center pb-4">
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-all shadow-inner"
            onClick={toggleCollapsed}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <nav className={`flex-1 overflow-y-auto flex flex-col gap-6 scrollbar-hide ${collapsed ? 'px-2' : 'px-4'} py-2`}>
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1.5">
            {!collapsed && (
              <div className="px-3 mb-1 text-[10px] font-black uppercase tracking-[0.15em] text-slate-600">
                {group.label}
              </div>
            )}
            {collapsed && <div className="h-px bg-slate-800/50 mx-2 mb-1" />}

            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const Icon = iconByPath[item.path] ?? Circle;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center rounded-lg transition-all duration-300 relative group
                      ${collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2.5 w-full'}
                      ${
                        isActive
                          ? 'bg-slate-800 text-white font-bold shadow-sm'
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
                          className={`flex-shrink-0 transition-all duration-300 ${
                            isActive 
                              ? 'text-[#C5A059] drop-shadow-[0_0_8px_rgba(197,160,89,0.6)]' 
                              : 'group-hover:scale-110'
                          }`} 
                        />
                        {!collapsed && <span className="truncate text-sm tracking-tight">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`flex-shrink-0 mt-auto border-t border-slate-800/30 ${collapsed ? 'p-2' : 'p-4'}`}>
        <button
          type="button"
          className={`flex items-center justify-center gap-3 rounded-lg text-sm font-bold text-slate-500 hover:bg-white/5 hover:text-white transition-all group active:scale-95 ${collapsed ? 'w-12 h-12 mx-auto' : 'w-full px-4 py-3'}`}
          onClick={handleLogout}
          title={collapsed ? "Sair da Conta" : undefined}
        >
          <LogOut size={collapsed ? 22 : 18} strokeWidth={2.5} className={`flex-shrink-0 ${!collapsed && 'group-hover:translate-x-1 transition-transform'}`} />
          {!collapsed && <span>Sair da Conta</span>}
        </button>
      </div>
    </aside>
  );
}
