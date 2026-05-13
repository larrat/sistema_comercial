import { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
  variant?: 'solid' | 'glass' | 'glass-heavy';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  id?: string;
  onClick?: () => void;
};

export function Card({ 
  children, 
  className = '', 
  variant = 'solid', 
  padding = 'md',
  id,
  onClick
}: CardProps) {
  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const variants = {
    solid: 'bg-surface-card border-border-subtle shadow-sm',
    glass: 'rf-glass shadow-xl',
    'glass-heavy': 'rf-glass-heavy shadow-2xl'
  };

  const baseClasses = `
    rounded-2xl 
    border 
    transition-all 
    duration-300 
    overflow-hidden
    ${variants[variant]}
    ${paddings[padding]}
    ${onClick ? 'cursor-pointer hover:border-border-bold hover:translate-y-[-2px]' : ''}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <div id={id} className={baseClasses} onClick={onClick}>
      {children}
    </div>
  );
}
