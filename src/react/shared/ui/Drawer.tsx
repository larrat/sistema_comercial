import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingState } from './LoadingState';
import { Button } from './Button';
import { X } from 'lucide-react';

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

  function stopPropagation(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  const drawerClass = [
    'rf-ui-drawer rf-glass',
    size === 'sm' ? 'rf-ui-drawer--sm' : size === 'lg' ? 'rf-ui-drawer--lg' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <AnimatePresence>
      {open && (
        <>
          {withOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeOnOverlayClick ? onClose : undefined}
              className="rf-ui-drawer-overlay fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />
          )}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={drawerClass}
            onClick={stopPropagation}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : 'Painel lateral'}
          >
            <div className="rf-ui-drawer__head">
              <div className="min-w-0">
                {title ? (
                  <div id={titleId} className="rf-ui-drawer__title text-white font-black uppercase tracking-tight">
                    {title}
                  </div>
                ) : null}
                {subtitle ? <div className="rf-ui-drawer__subtitle text-slate-400 text-[10px] uppercase font-bold mt-1 tracking-wider">{subtitle}</div> : null}
              </div>
              <div className="rf-ui-drawer__actions flex items-center gap-3">
                {action}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div className={`rf-ui-drawer__body ${bodyClassName || ''} py-4`}>
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="h-8 w-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                </div>
              ) : (
                children
              )}
            </div>

            {footer && (
              <div className="rf-ui-drawer__footer pt-6 border-t border-white/5 bg-black/10 -mx-8 -mb-8 px-8 pb-8">
                {footer}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
