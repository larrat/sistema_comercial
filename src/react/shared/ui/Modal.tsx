import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = {
  open: boolean;
  title?: string;
  subtitle?: ReactNode | ReactNode[];
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  closeOnOverlay?: boolean;
  closeOnOverlayClick?: boolean;
};

export function Modal({
  open,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  onClose,
  closeOnOverlay,
  closeOnOverlayClick
}: ModalProps) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  const shouldCloseOnOverlay = closeOnOverlay ?? closeOnOverlayClick ?? true;

  // Scroll lock and Escape key listener
  useEffect(() => {
    if (!open) return;
    
    // Scroll lock
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && shouldCloseOnOverlay) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.body.style.overflow = originalStyle;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, shouldCloseOnOverlay, onClose]);

  // Focus trap
  useEffect(() => {
    if (!open || !modalRef.current) return;
    
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    // Auto focus first element
    firstElement.focus();
    
    function handleTabKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
    
    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [open]);

  if (!open) return null;

  function handleOverlayClick() {
    if (!shouldCloseOnOverlay) return;
    onClose();
  }

  function stopPropagation(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  return createPortal(
    <div className="modal-overlay rf-ui-modal-overlay" onClick={handleOverlayClick}>
      <div
        ref={modalRef}
        className={`modal-box modal-panel rf-ui-modal rf-ui-modal--${size}`}
        onClick={stopPropagation}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        {title ? (
          <div className="rf-ui-modal__header">
            <h2 id={titleId} className="rf-ui-modal__title">{title}</h2>
            {subtitle ? (
              <div className="text-sm text-slate-400 mt-1">
                {Array.isArray(subtitle) 
                  ? subtitle.map((line, i) => <div key={i}>{line}</div>) 
                  : subtitle}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="rf-ui-modal__body">{children}</div>
        {footer ? <div className="rf-ui-modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
