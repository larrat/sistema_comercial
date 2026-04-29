import type { ReactNode } from 'react';

type FormFieldProps = {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  disabled?: boolean;
  children: ReactNode;
};

export function FormField({ label, htmlFor, required, hint, error, disabled, children }: FormFieldProps) {
  return (
    <div className={`rf-ui-form-field${disabled ? ' rf-ui-form-field--disabled' : ''}`}>
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
