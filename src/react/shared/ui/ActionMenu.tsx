import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export type ActionMenuItem = {
  key: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
};

export type ActionMenuProps = {
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
  function stopPropagation(event: React.MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return (
    <div className="relative inline-flex" onClick={stopPropagation} onMouseDown={stopPropagation}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className={
              buttonClassName ??
              'flex items-center justify-center h-9 w-9 rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white border border-transparent hover:border-white/5 active:scale-95'
            }
            type="button"
            aria-label={label}
            data-testid={buttonTestId}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className={
              menuClassName ??
              `z-50 min-w-[200px] rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-2xl py-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5 overflow-hidden animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[side=right]:slide-in-from-left-2 data-[side=left]:slide-in-from-right-2 duration-150`
            }
            align={align === 'right' ? 'end' : 'start'}
            sideOffset={4}
            onClick={stopPropagation}
          >
            {items.map((item) => (
              <DropdownMenu.Item
                key={item.key}
                className={`block w-full px-4 py-2.5 text-left text-[11px] font-black uppercase tracking-widest transition-colors outline-none cursor-pointer ${
                  item.danger 
                    ? 'text-rose-400 focus:bg-rose-500/20 hover:bg-rose-500/20' 
                    : 'text-slate-300 focus:bg-white/10 focus:text-white hover:bg-white/10 hover:text-white'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                }}
              >
                {item.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
