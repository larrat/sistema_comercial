import type { ReactNode } from 'react';

type ChartCardProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
};

export function ChartCard({ title, description, action, children }: ChartCardProps) {
  return (
    <section className="rf-ui-chart-card">
      <div className="rf-ui-chart-card__head">
        <div className="rf-ui-chart-card__copy">
          <h3 className="rf-ui-chart-card__title">{title}</h3>
          {description ? <div className="rf-ui-chart-card__description">{description}</div> : null}
        </div>
        {action ? <div className="rf-ui-chart-card__action">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
