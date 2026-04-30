import { EmptyState } from '../../../shared/ui';

type EmptyChartStateProps = {
  title?: string;
  description?: string;
};

export function EmptyChartState({
  title = 'Sem dados para exibir',
  description = 'Ajuste o período ou aguarde novos registros para montar este gráfico.'
}: EmptyChartStateProps) {
  return (
    <div className="rf-ui-chart__empty">
      <EmptyState title={title} description={description} compact />
    </div>
  );
}
