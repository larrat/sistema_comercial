import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  label?: string;
  error?: string;
  containerClassName?: string;
  options?: Array<{ value: string | number; label: string }>;
  helperText?: string;
  value?: string | number;
  onChange?: (e: any) => void;
  onValueChange?: (value: string) => void;
  placeholder?: string;
}

export function Select({
  label,
  error,
  containerClassName = '',
  className = '',
  id,
  options = [],
  helperText,
  value,
  onChange,
  onValueChange,
  placeholder = 'Selecione uma opção',
  ...props
}: SelectProps) {
  const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;

  const handleValueChange = (val: string) => {
    const finalVal = val === '__empty__' ? '' : val;
    if (onValueChange) onValueChange(finalVal);
    if (onChange) {
      onChange({ target: { value: finalVal, name: props.name } } as any);
    }
  };

  return (
    <div className={`rf-ui-form-field ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="rf-ui-form-field__label text-xs font-bold text-slate-300 uppercase tracking-widest mb-2 block">
          {label}
          {props.required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="rf-ui-form-field__control">
        <SelectPrimitive.Root
          value={value !== undefined ? (String(value) === '' ? '__empty__' : String(value)) : undefined}
          onValueChange={handleValueChange}
          disabled={props.disabled}
          name={props.name}
        >
          <SelectPrimitive.Trigger
            id={selectId}
            className={`flex items-center justify-between w-full rf-input-premium bg-slate-900/50 backdrop-blur-sm border border-white/10 px-4 py-2.5 rounded-xl text-sm text-slate-200 outline-none focus:ring-2 focus:ring-teal-500/50 data-[placeholder]:text-slate-500 transition-all ${error ? '!border-rose-500 !ring-rose-500/20' : ''} ${className}`}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className="z-[999] overflow-hidden bg-slate-900 border border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] animate-in fade-in-80 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
              position="popper"
              sideOffset={4}
            >
              <SelectPrimitive.Viewport className="p-1">
                {options.map((opt) => {
                  const itemValue = String(opt.value) === '' ? '__empty__' : String(opt.value);
                  return (
                    <SelectPrimitive.Item
                      key={itemValue}
                      value={itemValue}
                      className="relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-2 text-sm text-slate-200 outline-none hover:bg-slate-800 focus:bg-slate-800 focus:text-teal-400 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors"
                    >
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        <SelectPrimitive.ItemIndicator>
                          <Check className="h-4 w-4 text-teal-500" />
                        </SelectPrimitive.ItemIndicator>
                      </span>
                      <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                  );
                })}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      </div>

      {helperText && !error && (
        <p className="text-[10px] text-slate-400 mt-1 italic">{helperText}</p>
      )}

      {error && (
        <p className="rf-ui-form-field__error text-[10px] text-rose-500 mt-1 font-bold">{error}</p>
      )}
    </div>
  );
}
