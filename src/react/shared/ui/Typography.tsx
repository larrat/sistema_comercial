import type { ReactNode, ElementType } from 'react';

type TypographyVariant = 'h1' | 'h2' | 'h3' | 'body' | 'body-sm' | 'caption' | 'label';

type TypographyProps = {
  children: ReactNode;
  as?: ElementType;
  variant?: TypographyVariant;
  className?: string;
  weight?: 'normal' | 'medium' | 'bold' | 'black';
  color?: 'primary' | 'secondary' | 'tertiary' | 'muted' | 'accent' | 'inherit';
  align?: 'left' | 'center' | 'right';
  id?: string;
};

export function Typography({
  children,
  as,
  variant = 'body',
  className = '',
  weight,
  color,
  align = 'left',
  id
}: TypographyProps) {
  // Determine the HTML tag if not provided
  const Component = as || (
    variant === 'h1' ? 'h1' :
    variant === 'h2' ? 'h2' :
    variant === 'h3' ? 'h3' :
    'p'
  );

  const variants = {
    h1: 'text-3xl lg:text-4xl tracking-tight',
    h2: 'text-2xl lg:text-3xl tracking-tight',
    h3: 'text-xl lg:text-2xl tracking-tight',
    body: 'text-base leading-relaxed',
    'body-sm': 'text-sm leading-snug',
    caption: 'text-xs uppercase tracking-wider',
    label: 'text-[11px] font-bold uppercase tracking-widest'
  };

  const weights = {
    normal: 'font-normal',
    medium: 'font-medium',
    bold: 'font-bold',
    black: 'font-black'
  };

  const colors = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    tertiary: 'text-tertiary',
    muted: 'text-muted',
    accent: 'text-accent',
    inherit: ''
  };

  const aligns = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  // Default weight and color based on variant if not explicitly provided
  const finalWeight = weight || (
    variant.startsWith('h') || variant === 'label' ? 'bold' : 'normal'
  );
  const finalColor = color || (
    variant.startsWith('h') ? 'primary' : 
    variant === 'caption' ? 'tertiary' : 
    variant === 'label' ? 'muted' : 'secondary'
  );

  const baseClasses = `
    ${variants[variant]}
    ${weights[finalWeight]}
    ${colors[finalColor]}
    ${aligns[align]}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <Component id={id} className={baseClasses}>
      {children}
    </Component>
  );
}
