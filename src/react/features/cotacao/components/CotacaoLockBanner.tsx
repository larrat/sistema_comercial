import { StatusBadge } from '../../../shared/ui';
import { useCotacaoStore } from '../store/useCotacaoStore';

type Props = {
  onToggleLock: () => void;
  saving?: boolean;
};

export function CotacaoLockBanner({ onToggleLock, saving = false }: Props) {
  const config = useCotacaoStore((s) => s.config);
  const locked = !!config?.locked;

  return (
    <div className={`alert ${config?.locked ? 'al-a' : 'al-b'}`}>
      <div className="rf-ui-lock-banner">
        <div className="rf-ui-lock-banner__copy">
          <StatusBadge tone={locked ? 'warning' : 'success'}>
            {locked ? 'Travada' : 'Liberada'}
          </StatusBadge>
          <span>
            {locked
              ? 'A cotação está protegida contra edição. A grade React bloqueia alterações enquanto esse estado estiver ativo.'
              : 'A cotação está liberada para edição. Alterações na grade React são persistidas por célula.'}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          onClick={onToggleLock}
          disabled={saving}
        >
          {saving ? 'Salvando...' : locked ? 'Destravar' : 'Travar'}
        </button>
      </div>
    </div>
  );
}
