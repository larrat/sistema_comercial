import { NavLink } from 'react-router-dom';

import { useNavigationItems } from '../hooks/useNavigationItems';

export function AppSidebar() {
  const groups = useNavigationItems();

  return (
    <aside className="rf-sidebar" aria-label="Navegação principal React">
      <div className="rf-sidebar__brand">
        <div className="rf-sidebar__kicker">React-first</div>
        <div className="rf-sidebar__title">Sistema Comercial</div>
        <p className="rf-sidebar__sub">
          Shell novo da operação comercial, isolado da navegação legacy.
        </p>
      </div>

      <nav className="rf-sidebar__nav">
        {groups.map((group) => (
          <section key={group.label} className="rf-sidebar__group">
            <div className="rf-sidebar__group-label">{group.label}</div>
            <div className="rf-sidebar__group-items">
              {group.items.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) => `rf-sidebar__item${isActive ? ' is-active' : ''}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </nav>

      <div className="rf-sidebar__footer">
        <div className="rf-sidebar__footer-label">Onda 1</div>
        <div className="rf-sidebar__footer-copy">
          Dashboard, clientes, pedidos, contas a receber e produtos entram aqui nas próximas rodadas.
        </div>
      </div>
    </aside>
  );
}
