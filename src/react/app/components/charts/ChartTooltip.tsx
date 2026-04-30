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
  if (typeof value === 'number') return new Intl.NumberFormat('pt-BR').format(value);
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
    <div className="rf-ui-chart-tooltip">
      {labelText ? <div className="rf-ui-chart-tooltip__label">{labelText}</div> : null}
      {isMultiSeries
        ? payload.map((row, index) => (
            <div key={`${String(row.name ?? 'serie')}-${index}`} className="rf-ui-chart-tooltip__value">
              {String(row.name ?? 'Série')}: {valueFormatter(row.value, row.payload)}
            </div>
          ))
        : <div className="rf-ui-chart-tooltip__value">{valueFormatter(item.value, item.payload)}</div>}
    </div>
  );
}
