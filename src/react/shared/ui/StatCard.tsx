import type { ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: ReactNode;
  foot?: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
};

export function StatCard({ label, value, foot, tone = 'default' }: StatCardProps) {
  return (
    <section className={`rf-ui-stat-card rf-ui-stat-card--${tone}`}>
      <div className="rf-ui-stat-card__label">{label}</div>
      <div className="rf-ui-stat-card__value">{value}</div>
      {foot ? <div className="rf-ui-stat-card__foot">{foot}</div> : null}
    </section>
  );
}
