import type { ReactNode, CSSProperties } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './index';

const cardVariants = cva(
  'rounded-2xl border transition-[color,background-color,border-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden',
  {
    variants: {
      variant: {
        solid: 'bg-slate-900 border-white/5 shadow-sm',
        glass: 'bg-slate-900/40 backdrop-blur-md border-white/10 shadow-xl',
        'glass-heavy': 'bg-slate-900/60 backdrop-blur-xl border-white/20 shadow-2xl',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
      isInteractive: {
        true: 'cursor-pointer hover:border-white/20 hover:-translate-y-[2px] active:scale-[0.98]',
        false: '',
      }
    },
    defaultVariants: {
      variant: 'solid',
      padding: 'md',
      isInteractive: false,
    },
  }
);

export interface CardProps extends VariantProps<typeof cardVariants> {
  children: ReactNode;
  className?: string;
  id?: string;
  onClick?: () => void;
  style?: CSSProperties;
}

export function Card({ 
  children, 
  className, 
  variant, 
  padding,
  id,
  onClick,
  style
}: CardProps) {
  return (
    <div 
      id={id} 
      className={cn(cardVariants({ variant, padding, isInteractive: !!onClick, className }))} 
      onClick={onClick} 
      style={style}
    >
      {children}
    </div>
  );
}
