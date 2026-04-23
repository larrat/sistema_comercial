import type { ReactNode } from 'react';

type PageHeaderProps = {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
};

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  meta
}: PageHeaderProps) {
  return (
    <header className="rf-ui-page-header">
      <div className="rf-ui-page-header__copy">
        {kicker ? <div className="rf-ui-page-header__kicker">{kicker}</div> : null}
        <h1 className="rf-ui-page-header__title">{title}</h1>
        {description ? <p className="rf-ui-page-header__description">{description}</p> : null}
      </div>
      {(actions || meta) && (
        <div className="rf-ui-page-header__meta">
          {actions ? <div className="rf-ui-page-header__actions">{actions}</div> : null}
          {meta ? <div className="rf-ui-page-header__extra">{meta}</div> : null}
        </div>
      )}
    </header>
  );
}
