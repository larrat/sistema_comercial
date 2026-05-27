import { type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

export type ModalProps = {
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
  const shouldCloseOnOverlay = closeOnOverlay ?? closeOnOverlayClick ?? true;

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200" />
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
          <Dialog.Content 
            className={`pointer-events-auto w-full flex flex-col max-h-full bg-slate-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200 rf-ui-modal--${size}`}
            onPointerDownOutside={(e) => {
              if (!shouldCloseOnOverlay) e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              if (!shouldCloseOnOverlay) e.preventDefault();
            }}
          >
            {title ? (
              <div className="flex-shrink-0 px-6 py-5 border-b border-white/5">
                <Dialog.Title className="text-lg font-bold text-white tracking-tight">
                  {title}
                </Dialog.Title>
                {subtitle ? (
                  <div className="text-sm text-slate-400 mt-1.5">
                    {Array.isArray(subtitle) 
                      ? subtitle.map((line, i) => <div key={i}>{line}</div>) 
                      : subtitle}
                  </div>
                ) : null}
              </div>
            ) : (
               <Dialog.Title className="sr-only">Dialog</Dialog.Title>
            )}
            
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {children}
            </div>

            {footer ? (
              <div className="flex-shrink-0 px-6 py-4 border-t border-white/5 bg-slate-900/50 rounded-b-2xl">
                {footer}
              </div>
            ) : null}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
