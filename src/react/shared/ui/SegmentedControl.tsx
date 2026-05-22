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
    <div className={`flex items-center gap-1.5 bg-white/5 p-1.5 rounded-xl border border-white/5 shadow-inner overflow-hidden ${className}`}>
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
                  ? 'bg-white/10 text-white shadow-lg scale-[1.02] border border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
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
