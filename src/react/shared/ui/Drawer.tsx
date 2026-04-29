import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';
import { LoadingState } from './LoadingState';

export type DrawerProps = {
  open: boolean;
  title?: string;
  subtitle?: string;
  /** Slot de ação no cabeçalho (ex: botão "Editar") */
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  withOverlay?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  bodyClassName?: string;
  onClose: () => void;
};

export function Drawer({
  open,
  title,
  subtitle,
  action,
  children,
  footer,
  size = 'md',
  loading = false,
  withOverlay = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  bodyClassName,
  onClose
}: DrawerProps) {
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || !closeOnEsc) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, closeOnEsc]);

  if (!open) return null;

  function stopPropagation(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  const drawerClass = [
    'rf-ui-drawer',
    size === 'sm' ? 'rf-ui-drawer--sm' : size === 'lg' ? 'rf-ui-drawer--lg' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={`rf-ui-drawer-overlay ${withOverlay ? '' : 'rf-ui-drawer-overlay--no-bg'}`}
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <aside
        className={drawerClass}
        onClick={stopPropagation}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'Painel lateral'}
      >
        <div className="rf-ui-drawer__head">
          <div>
            {title ? (
              <div id={titleId} className="rf-ui-drawer__title">
                {title}
              </div>
            ) : null}
            {subtitle ? <div className="rf-ui-drawer__subtitle">{subtitle}</div> : null}
          </div>
          <div className="rf-ui-drawer__actions">
            {action}
            <button type="button" className="btn btn-sm" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
        <div className={`rf-ui-drawer__body${bodyClassName ? ` ${bodyClassName}` : ''}`}>
          {loading ? <LoadingState compact /> : children}
        </div>
        {footer ? <div className="rf-ui-drawer__footer">{footer}</div> : null}
      </aside>
    </div>
  );
}
