import type { ReactNode } from 'react';

type FormFieldProps = {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
};

export function FormField({ label, htmlFor, required, hint, error, children }: FormFieldProps) {
  return (
    <div className="rf-ui-form-field">
      <label className="rf-ui-form-field__label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="rf-ui-form-field__required">*</span> : null}
      </label>
      <div className="rf-ui-form-field__control">{children}</div>
      {hint ? <p className="rf-ui-form-field__hint">{hint}</p> : null}
      {error ? <p className="rf-ui-form-field__error">{error}</p> : null}
    </div>
  );
}
