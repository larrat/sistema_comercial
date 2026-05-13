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
          'h-8 w-8 rounded-md text-slate-400 transition-colors hover:bg-white/5 hover:text-white'
        }
        type="button"
        aria-label={label}
        data-testid={buttonTestId}
        onClick={() => setOpen((prev) => !prev)}
      >
        ⋯
      </button>

      {open ? (
        <div
          className={
            menuClassName ??
            `absolute top-9 z-10 min-w-[140px] rounded-md border border-white/5 bg-slate-900 py-1 shadow-2xl ${
              align === 'right' ? 'right-0' : 'left-0'
            }`
          }
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.key}
              className={`block w-full px-3 py-1.5 text-left text-sm transition-colors ${
                item.danger ? 'text-rose-400 hover:bg-rose-500/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'
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
