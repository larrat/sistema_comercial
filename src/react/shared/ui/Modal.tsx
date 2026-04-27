import { useEffect, useId, type MouseEvent, type ReactNode } from 'react';

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
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && closeOnOverlay) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnOverlay, onClose]);

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
        aria-labelledby={title ? titleId : undefined}
      >
        {title ? <div id={titleId} className="rf-ui-modal__title">{title}</div> : null}
        <div className="rf-ui-modal__body">{children}</div>
        {footer ? <div className="rf-ui-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
