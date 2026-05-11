import { useToastStore } from '../lib/useToastStore';

export function GlobalLoadingOverlay() {
  const loading = useToastStore((state) => state.loading);

  if (!loading.active) return null;

  return (
    <div className="rf-overlay" aria-live="polite" aria-busy="true">
      <div className="rf-overlay__card">
        <div className="sk-line" />
        <p>{loading.label}</p>
      </div>
    </div>
  );
}
