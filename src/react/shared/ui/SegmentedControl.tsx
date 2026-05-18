import type { ReactNode } from 'react';

type Option<T> = {
  id: T;
  label: string;
  icon?: ReactNode;
};

type SegmentedControlProps<T> = {
  options: Option<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
};

export function SegmentedControl<T extends string | number>({
  options,
  activeId,
  onChange,
  className = ''
}: SegmentedControlProps<T>) {
  return (
    <div className={`flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner overflow-hidden ${className}`}>
      {options.map((option) => {
        const isActive = activeId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`
              flex items-center gap-2 px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg transition-colors duration-300
              ${
                isActive
                  ? 'bg-slate-900 text-white shadow-lg scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }
            `}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
