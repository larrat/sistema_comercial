import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  "inline-flex items-center justify-center font-bold font-sans transition-[transform,color,background-color,box-shadow,border-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 disabled:opacity-50 disabled:pointer-events-none rounded-[16px] whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-none shadow-[0_4px_15px_rgba(34,211,238,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.35)] hover:-translate-y-0.5",
        secondary: "bg-white/[0.03] border border-white/10 text-slate-200 hover:bg-[#2d3748] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.4)] hover:-translate-y-px",
        danger: "bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/30",
        ghost: "bg-transparent border-transparent shadow-none hover:bg-white/5",
      },
      size: {
        sm: "text-xs px-3 py-1.5 gap-1.5",
        md: "text-sm px-4 py-2 gap-2",
        lg: "text-base px-6 py-3 gap-2.5",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
);

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  children,
  variant,
  size,
  loading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={loading || disabled}
      aria-disabled={loading || disabled}
      {...props}
    >
      <div className="relative flex items-center justify-center min-h-[1em]">
        {/* Loading Spinner */}
        <div 
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            loading ? "opacity-100 scale-100" : "opacity-0 scale-50"
          )}
        >
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        </div>

        {/* Normal Content (Text + Icons) */}
        <div 
          className={cn(
            "flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            loading ? "opacity-0 scale-95" : "opacity-100 scale-100",
            size === "sm" ? "gap-1.5" : size === "lg" ? "gap-2.5" : "gap-2"
          )}
        >
          {leftIcon && <span aria-hidden="true" className="flex items-center justify-center">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span aria-hidden="true" className="flex items-center justify-center">{rightIcon}</span>}
        </div>
      </div>
    </button>
  );
}
