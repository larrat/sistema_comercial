import React from 'react';

type PillOption<T extends string> = {
  id: T;
  label: string;
};

type PillGroupProps<T extends string> = {
  options: PillOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
};

export function PillGroup<T extends string>({
  options,
  activeId,
  onChange,
  className = ''
}: PillGroupProps<T>) {
  return (
    <div className={`rf-pill-group ${className}`}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`rf-pill ${activeId === option.id ? 'is-active' : ''}`}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
