import { useToastStore } from '../lib/useToastStore';

export function GlobalToastHost() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  if (!toasts.length) return null;

  return (
    <div className="rf-toast-host" aria-live="polite" aria-atomic="true">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={`rf-toast rf-toast--${item.severity}`}
          onClick={() => dismissToast(item.id)}
          role="status"
          style={{ cursor: 'pointer' }}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
