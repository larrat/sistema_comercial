import { Typography } from './Typography';
import type { ReactNode } from 'react';

type FormSectionProps = {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
};

export function FormSection({ title, description, aside, children }: FormSectionProps) {
  return (
    <section className="rf-card-premium rf-ui-form-section">
      <div className="rf-ui-form-section__head flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <Typography variant="h3" weight="black" className="uppercase tracking-tight text-lg">
            {title}
          </Typography>
          {description ? (
            <Typography variant="body-sm" color="muted" className="max-w-xl">
              {description}
            </Typography>
          ) : null}
        </div>
        {aside ? <div className="rf-ui-form-section__aside">{aside}</div> : null}
      </div>
      <div className="rf-ui-form-section__body">{children}</div>
    </section>
  );
}
