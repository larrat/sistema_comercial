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
  const rowPayload = item.payload;
  const labelText = labelFormatter ? labelFormatter(label) : String(label ?? item.name ?? '');
  const valueText = valueFormatter(item.value, rowPayload);

  return (
    <div className="rf-ui-chart-tooltip">
      {labelText ? <div className="rf-ui-chart-tooltip__label">{labelText}</div> : null}
      <div className="rf-ui-chart-tooltip__value">{valueText}</div>
    </div>
  );
}
