import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';

type DrawerProps = {
  open: boolean;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  withOverlay?: boolean;
  closeOnOverlayClick?: boolean;
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
  withOverlay = true,
  closeOnOverlayClick = true,
  bodyClassName,
  onClose
}: DrawerProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  if (!open) return null;

  function stopPropagation(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  return (
    <div
      className={`rf-ui-drawer-overlay ${withOverlay ? '' : 'rf-ui-drawer-overlay--no-bg'}`}
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <aside
        className="rf-ui-drawer"
        onClick={stopPropagation}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Painel lateral'}
      >
        <div className="rf-ui-drawer__head">
          <div>
            {title ? <div className="rf-ui-drawer__title">{title}</div> : null}
            {subtitle ? <div className="rf-ui-drawer__subtitle">{subtitle}</div> : null}
          </div>
          <div className="rf-ui-drawer__actions">
            {action}
            <button type="button" className="btn btn-sm" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
        <div className={`rf-ui-drawer__body${bodyClassName ? ` ${bodyClassName}` : ''}`}>{children}</div>
        {footer ? <div className="rf-ui-drawer__footer">{footer}</div> : null}
      </aside>
    </div>
  );
}
