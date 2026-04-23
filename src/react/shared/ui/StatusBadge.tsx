import type { ReactNode } from 'react';

type StatusBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

type StatusBadgeProps = {
  children: ReactNode;
  tone?: StatusBadgeTone;
};

const BADGE_CLASS_BY_TONE: Record<StatusBadgeTone, string> = {
  neutral: 'bk',
  info: 'bb',
  success: 'bg',
  warning: 'ba',
  danger: 'br'
};

export function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  return <span className={`bdg ${BADGE_CLASS_BY_TONE[tone]}`}>{children}</span>;
}
