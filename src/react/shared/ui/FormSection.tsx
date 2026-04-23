import type { ReactNode } from 'react';

type FormSectionProps = {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
};

export function FormSection({ title, description, aside, children }: FormSectionProps) {
  return (
    <section className="card-shell rf-ui-form-section">
      <div className="rf-ui-form-section__head">
        <div>
          <h2 className="rf-ui-form-section__title">{title}</h2>
          {description ? (
            <p className="rf-ui-form-section__description table-cell-caption table-cell-muted">
              {description}
            </p>
          ) : null}
        </div>
        {aside ? <div className="rf-ui-form-section__aside">{aside}</div> : null}
      </div>
      <div className="rf-ui-form-section__body">{children}</div>
    </section>
  );
}
