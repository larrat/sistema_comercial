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
    document.documentElement.style.setProperty('--rf-sidebar-width', collapsed ? '64px' : '240px');
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
    <aside className={`rf-sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Navegação principal">
      <div className="rf-sidebar__brand">
        <div className="rf-sidebar__brand-main">
          <div className="rf-sidebar__brand-copy" aria-hidden={collapsed}>
            <Store className="rf-sidebar__brand-icon" strokeWidth={1.9} />
            {!collapsed ? <div className="rf-sidebar__title">Sistema Comercial</div> : null}
          </div>
          <button
            type="button"
            className="rf-sidebar__toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          >
            {collapsed ? <ChevronRight size={16} strokeWidth={2} /> : <ChevronLeft size={16} strokeWidth={2} />}
          </button>
        </div>
      </div>

      <div className="rf-sidebar__switcher-slot">
        <FilialSwitcher />
      </div>

      <nav className="rf-sidebar__nav">
        {groups.map((group) => (
          <div key={group.label} className="rf-sidebar__group">
            {collapsed ? (
              <div className="rf-sidebar__group-divider" aria-hidden="true" />
            ) : (
              <div className="rf-sidebar__group-label">{group.label}</div>
            )}

            <div className="rf-sidebar__group-items">
              {group.items.map((item) => {
                const Icon = iconByPath[item.path] ?? Circle;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) => `rf-sidebar__item${isActive ? ' is-active' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="rf-sidebar__item-icon" size={15} strokeWidth={1.8} />
                    {!collapsed ? <span className="rf-sidebar__item-label">{item.label}</span> : null}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="rf-sidebar__footer">
        <button
          type="button"
          className="rf-sidebar__logout-btn"
          onClick={handleLogout}
          title={collapsed ? 'Sair' : undefined}
        >
          {collapsed ? <LogOut size={16} strokeWidth={1.9} /> : 'Sair'}
        </button>
      </div>
    </aside>
  );
}
