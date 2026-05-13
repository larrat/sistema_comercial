import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, containerClassName = '', className = '', id, helperText, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div className={`rf-ui-form-field ${containerClassName}`}>
        {label && (
          <label htmlFor={inputId} className="rf-ui-form-field__label">
            {label}
            {props.required && <span className="rf-ui-form-field__required">*</span>}
          </label>
        )}

        <div className="rf-ui-form-field__control">
          <input
            id={inputId}
            ref={ref}
            className={`rf-input-premium ${error ? '!border-red-500 !ring-red-500/20' : ''} ${className}`}
            {...props}
          />
        </div>

        {helperText && !error && (
          <p className="text-[10px] text-slate-400 mt-1 italic">{helperText}</p>
        )}

        {error && <p className="rf-ui-form-field__error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
