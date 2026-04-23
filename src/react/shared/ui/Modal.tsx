import type { MouseEvent, ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  closeOnOverlay?: boolean;
};

export function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  closeOnOverlay = true
}: ModalProps) {
  if (!open) return null;

  function handleOverlayClick() {
    if (!closeOnOverlay) return;
    onClose();
  }

  function stopPropagation(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  return (
    <div className="modal-overlay rf-ui-modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal-box rf-ui-modal"
        onClick={stopPropagation}
        role="dialog"
        aria-modal="true"
      >
        {title ? <div className="rf-ui-modal__title">{title}</div> : null}
        <div className="rf-ui-modal__body">{children}</div>
        {footer ? <div className="rf-ui-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
