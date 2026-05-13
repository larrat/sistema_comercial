import { StatusBadge, Button } from '../../../shared/ui';
import { useCotacaoStore } from '../store/useCotacaoStore';

type Props = {
  onToggleLock: () => void;
  saving?: boolean;
};

export function CotacaoLockBanner({ onToggleLock, saving = false }: Props) {
  const config = useCotacaoStore((s) => s.config);
  const locked = !!config?.locked;

  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors shadow-sm ${locked ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
      <div className="flex items-center gap-4">
        <StatusBadge tone={locked ? 'warning' : 'success'}>
          {locked ? 'Travada' : 'Liberada'}
        </StatusBadge>
        <span className={`text-sm font-medium ${locked ? 'text-amber-700' : 'text-emerald-700'}`}>
          {locked
            ? 'A cotação está protegida contra edição.'
            : 'A cotação está liberada. Alterações são salvas automaticamente.'}
        </span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        className={locked ? '!bg-amber-100 !border-amber-200 !text-amber-800 hover:!bg-amber-200' : '!bg-emerald-100 !border-emerald-200 !text-emerald-800 hover:!bg-emerald-200'}
        onClick={onToggleLock}
        loading={saving}
      >
        {locked ? 'Destravar' : 'Travar'}
      </Button>
    </div>
  );
}
