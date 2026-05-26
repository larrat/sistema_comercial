import { fmtBRL } from '../../../shared/lib/formatters';

type ChartTooltipValue = number | string | null | undefined;

type TooltipRow = {
  value?: ChartTooltipValue;
  name?: string | number;
  color?: string;
  payload?: Record<string, unknown>;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: TooltipRow[];
  label?: string | number;
  valueFormatter?: (value: ChartTooltipValue, row?: Record<string, unknown>) => string;
  labelFormatter?: (value: string | number | undefined) => string;
};

function defaultValueFormatter(value: ChartTooltipValue): string {
  if (typeof value === 'number') return fmtBRL(value);
  if (typeof value === 'string') return value;
  return '—';
}

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = defaultValueFormatter,
  labelFormatter
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const labelText = labelFormatter ? labelFormatter(label) : String(label ?? item.name ?? '');
  const isMultiSeries = payload.length > 1;

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-700/50 rounded-lg p-3 shadow-xl backdrop-blur-md">
      {labelText ? <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-700 pb-2">{labelText}</div> : null}
      <div className="flex flex-col gap-1.5">
        {isMultiSeries
          ? payload.map((row, index) => (
              <div key={`${String(row.name ?? 'serie')}-${index}`} className="flex items-center gap-3 justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color ?? '#3b82f6' }} />
                  <span className="text-slate-300">{String(row.name ?? 'Série')}</span>
                </div>
                <span className="font-bold text-white tabular-nums">{valueFormatter(row.value, row.payload)}</span>
              </div>
            ))
          : <div className="text-sm font-bold text-white tabular-nums">{valueFormatter(item.value, item.payload)}</div>}
      </div>
    </div>
  );
}
