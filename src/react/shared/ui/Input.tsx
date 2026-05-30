import { forwardRef, type InputHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './index';

const inputVariants = cva(
  'w-full bg-slate-900/50 border rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 transition-all shadow-inner placeholder:text-slate-600',
  {
    variants: {
      hasError: {
        true: 'border-rose-500/50 focus:ring-rose-500/20 focus:border-rose-500',
        false: 'border-slate-700/50 focus:ring-emerald-500/30 focus:border-emerald-500/50 hover:border-slate-600/50',
      },
    },
    defaultVariants: {
      hasError: false,
    },
  }
);

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, Omit<VariantProps<typeof inputVariants>, 'hasError'> {
  label?: string;
  error?: string;
  containerClassName?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, containerClassName, className, id, helperText, required, ...props }, ref) => {
    const generatedId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const errorId = `${generatedId}-error`;
    const helperId = `${generatedId}-helper`;

    const describedBy = [
      error ? errorId : undefined,
      helperText && !error ? helperId : undefined,
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div className={cn("w-full flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label htmlFor={generatedId} className="text-xs font-semibold text-slate-300 ml-1 flex items-center">
            {label}
            {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative">
          <input
            id={generatedId}
            ref={ref}
            required={required}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(inputVariants({ hasError: !!error }), className)}
            {...props}
          />
        </div>

        {helperText && !error && (
          <p id={helperId} className="text-[11px] text-slate-400 mt-0.5 ml-1 italic">
            {helperText}
          </p>
        )}

        {error && (
          <p id={errorId} className="text-[11px] text-rose-400 mt-0.5 ml-1 font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
