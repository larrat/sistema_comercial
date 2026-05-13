import type { SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  options?: Array<{ value: string | number; label: string }>;
  helperText?: string;
}

export function Select({
  label,
  error,
  containerClassName = '',
  className = '',
  id,
  options = [],
  helperText,
  children,
  ...props
}: SelectProps) {
  const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className={`rf-ui-form-field ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="rf-ui-form-field__label">
          {label}
          {props.required && <span className="rf-ui-form-field__required">*</span>}
        </label>
      )}
      
      <div className="rf-ui-form-field__control">
        <select
          id={selectId}
          className={`rf-input-premium ${error ? '!border-red-500 !ring-red-500/20' : ''} ${className}`}
          {...props}
        >
          {children || options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {helperText && !error && (
        <p className="text-[10px] text-slate-400 mt-1 italic">{helperText}</p>
      )}

      {error && (
        <p className="rf-ui-form-field__error">{error}</p>
      )}
    </div>
  );
}
