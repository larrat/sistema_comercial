import { useState, useRef, useEffect } from 'react';
import { CalendarIcon, ChevronDown, Check } from 'lucide-react';
import { Button, Input, Modal, FormSection } from '../../../shared/ui';

type DateRangeSlicerProps = {
  value: string;
  onChange: (val: string) => void;
};

export function DateRangeSlicer({ value, onChange }: DateRangeSlicerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const isCustom = value.startsWith('custom:');

  useEffect(() => {
    if (isCustom) {
      const [, start, end] = value.split(':');
      setCustomStart(start || '');
      setCustomEnd(end || '');
    }
  }, [value, isCustom]);

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      onChange(`custom:${customStart}:${customEnd}`);
      setIsOpen(false);
    }
  };

  const getLabel = () => {
    if (value === '7' || value === 'semana') return 'Últimos 7 dias';
    if (value === '30' || value === 'mes') return 'Últimos 30 dias';
    if (value === '90') return 'Últimos 90 dias';
    if (value === 'ano') return 'Este ano';
    if (value === 'tudo') return 'Todo período';
    if (isCustom) {
      const [, start, end] = value.split(':');
      const f = (d: string) => {
        if (!d) return '';
        const [y, m, day] = d.split('-');
        return `${day}/${m}/${y}`;
      };
      return `${f(start)} - ${f(end)}`;
    }
    return 'Período';
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-sm font-medium ${
          isCustom 
            ? 'bg-teal-500/20 border-teal-500/40 text-teal-400' 
            : 'bg-white/[0.03] border-white/5 text-slate-300 hover:bg-white/[0.06] hover:text-white'
        }`}
      >
        <CalendarIcon size={14} className={isCustom ? 'text-teal-400' : 'text-slate-400'} />
        {getLabel()}
        <ChevronDown size={14} className="opacity-50" />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Filtrar por Período"
        size="sm"
      >
        <div className="flex flex-col gap-1 p-1">
          {[
            { id: '7', label: 'Últimos 7 dias' },
            { id: '30', label: 'Últimos 30 dias' },
            { id: '90', label: 'Últimos 90 dias' },
            { id: 'ano', label: 'Este ano' },
            { id: 'tudo', label: 'Todo período' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => {
                onChange(opt.id);
                setIsOpen(false);
              }}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                value === opt.id ? 'bg-teal-500/20 text-teal-400' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {opt.label}
              {value === opt.id && <Check size={14} />}
            </button>
          ))}
          
          <div className="h-px bg-white/5 my-2" />
          
          <FormSection title="Período Personalizado">
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Input
                type="date"
                label="De"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <Input
                type="date"
                label="Até"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
            <Button
              className="w-full mt-3"
              onClick={handleApplyCustom}
              disabled={!customStart || !customEnd}
            >
              Aplicar Filtro
            </Button>
          </FormSection>
        </div>
      </Modal>
    </>
  );
}
