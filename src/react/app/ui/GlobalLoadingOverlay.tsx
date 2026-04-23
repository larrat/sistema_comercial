import { useEffect, useState } from 'react';

type LoadingDetail = {
  active?: boolean;
  label?: string;
};

const DEFAULT_LABEL = 'Preparando a nova estrutura React-first.';

export function GlobalLoadingOverlay() {
  const [state, setState] = useState<LoadingDetail>({ active: false, label: DEFAULT_LABEL });

  useEffect(() => {
    function handleLoading(event: Event) {
      const detail = (event as CustomEvent<LoadingDetail>).detail || {};
      setState({
        active: detail.active === true,
        label: detail.label || DEFAULT_LABEL
      });
    }

    window.addEventListener('sc:react-loading', handleLoading as EventListener);
    return () => {
      window.removeEventListener('sc:react-loading', handleLoading as EventListener);
    };
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
