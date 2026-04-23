import { useEffect, useState } from 'react';
import { subscribeLoading, type LoadingDetail } from '../legacy/events';

const DEFAULT_LABEL = 'Preparando a nova estrutura React-first.';

export function GlobalLoadingOverlay() {
  const [state, setState] = useState<LoadingDetail>({ active: false, label: DEFAULT_LABEL });

  useEffect(() => {
    return subscribeLoading((detail) => {
      setState({
        active: detail.active === true,
        label: detail.label || DEFAULT_LABEL
      });
    });
  }, []);

  if (!state.active) return null;

  return (
    <div className="rf-overlay" aria-live="polite" aria-busy="true">
      <div className="rf-overlay__card">
        <div className="sk-line" />
        <p>{state.label}</p>
      </div>
    </div>
  );
}
