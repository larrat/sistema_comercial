import { Link } from 'react-router-dom';

import { useFilialContext } from '../filial/FilialProvider';
import { usePageMeta } from '../hooks/usePageMeta';
import { useRouteState } from '../hooks/useRouteState';

export function AppTopbar() {
  const { filialId } = useFilialContext();
  const routeId = useRouteState();
  const meta = usePageMeta(routeId);

  return (
    <header className="rf-topbar">
      <div className="rf-topbar__copy">
        <div className="rf-topbar__kicker">{meta.kicker}</div>
        <h1 className="rf-topbar__title">{meta.title}</h1>
        <p className="rf-topbar__sub">{meta.description}</p>
      </div>

      <div className="rf-topbar__meta">
        {!!meta.actions?.length && (
          <div className="rf-topbar__actions" aria-label="Ações da página">
            {meta.actions.map((action) =>
              action.to ? (
                <Link
                  key={`${action.label}:${action.to}`}
                  to={action.to}
                  className={`rf-topbar__action${action.tone === 'primary' ? ' is-primary' : ''}`}
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.label}
                  className={`rf-topbar__action${action.tone === 'primary' ? ' is-primary' : ''}`}
                  type="button"
                  disabled
                >
                  {action.label}
                </button>
              )
            )}
          </div>
        )}
        <div className="rf-topbar__switcher-slot" aria-label="Espaço reservado para troca de filial">
          <div className="rf-topbar__switcher-label">Filial</div>
          <button className="rf-topbar__switcher" type="button" disabled>
            {filialId || 'Sem filial'}
          </button>
        </div>
        <span className="bdg bk">Shell React</span>
      </div>
    </header>
  );
}
