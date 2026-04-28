import { NavLink, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../useAuthStore';
import { useFilialStore } from '../useFilialStore';
import { useRoleStore } from '../useRoleStore';
import { useNavigationItems } from '../hooks/useNavigationItems';

export function AppSidebar() {
  const groups = useNavigationItems();
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearFilial = useFilialStore((s) => s.clearFilial);
  const clearRole = useRoleStore((s) => s.clearRole);
  const navigate = useNavigate();

  function handleLogout() {
    clearFilial();
    clearRole();
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="rf-sidebar" aria-label="Navegação principal">
      <div className="rf-sidebar__brand">
        <div className="rf-sidebar__title">Sistema Comercial</div>
      </div>

      <nav className="rf-sidebar__nav">
        {groups.flatMap((g) => g.items).map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => `rf-sidebar__item${isActive ? ' is-active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="rf-sidebar__footer">
        <button
          type="button"
          className="rf-sidebar__logout-btn"
          onClick={handleLogout}
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
