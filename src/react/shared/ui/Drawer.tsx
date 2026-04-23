import type { MouseEvent, ReactNode } from 'react';

type DrawerProps = {
  open: boolean;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

export function Drawer({ open, title, children, footer, onClose }: DrawerProps) {
  if (!open) return null;

  function stopPropagation(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  return (
    <div className="modal-overlay rf-ui-drawer-overlay" onClick={onClose}>
      <aside
        className="rf-ui-drawer"
        onClick={stopPropagation}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Painel lateral'}
      >
        <div className="rf-ui-drawer__head">
          {title ? <div className="rf-ui-drawer__title">{title}</div> : <div />}
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="rf-ui-drawer__body">{children}</div>
        {footer ? <div className="rf-ui-drawer__footer">{footer}</div> : null}
      </aside>
    </div>
  );
}
