import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'rf-btn-premium';
  
  const variants: Record<ButtonVariant, string> = {
    primary: 'rf-btn-premium--primary',
    secondary: '', // default premium is secondary-like
    danger: '!bg-red-500 !text-white !border-red-600 hover:!bg-red-600',
    ghost: '!bg-transparent !border-transparent !shadow-none hover:!bg-slate-800/50'
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5'
  };

  const combinedClasses = [
    baseStyles,
    variants[variant],
    sizes[size],
    loading || disabled ? 'opacity-50 pointer-events-none' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={combinedClasses}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        leftIcon
      )}
      
      <span>{children}</span>
      
      {!loading && rightIcon}
    </button>
  );
}
