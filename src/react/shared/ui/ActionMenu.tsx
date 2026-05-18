import { useEffect, useRef, useState, type MouseEvent } from 'react';

export type ActionMenuItem = {
  key: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
};

type ActionMenuProps = {
  items: ActionMenuItem[];
  label?: string;
  align?: 'left' | 'right';
  buttonClassName?: string;
  menuClassName?: string;
  buttonTestId?: string;
};

export function ActionMenu({
  items,
  label = 'Ações da linha',
  align = 'right',
  buttonClassName,
  menuClassName,
  buttonTestId
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent | globalThis.MouseEvent) {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  function stopPropagation(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return (
    <div
      ref={rootRef}
      className="relative inline-flex"
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
    >
      <button
        className={
          buttonClassName ??
          'flex items-center justify-center h-9 w-9 rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white border border-transparent hover:border-white/5 active:scale-95'
        }
        type="button"
        aria-label={label}
        data-testid={buttonTestId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      </button>

      {open ? (
        <div
          className={
            menuClassName ??
            `absolute top-11 z-50 min-w-[200px] rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-2xl py-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
              align === 'right' ? 'right-0' : 'left-0'
            }`
          }
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.key}
              className={`block w-full px-4 py-2.5 text-left text-[11px] font-black uppercase tracking-widest transition-colors ${
                item.danger ? 'text-rose-400 hover:bg-rose-500/20' : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
              type="button"
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
