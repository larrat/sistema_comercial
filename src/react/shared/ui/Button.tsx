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
    danger: '!bg-rose-500/10 !text-rose-500 !border-rose-500/20 hover:!bg-rose-500/20 hover:!border-rose-500/30',
    ghost: '!bg-transparent !border-transparent !shadow-none hover:!bg-surface-hover'
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
    loading || disabled ? 'opacity-50 pointer-events-none' : 'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40',
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
