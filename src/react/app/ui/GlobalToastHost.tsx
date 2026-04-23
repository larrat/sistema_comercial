import { useEffect, useState } from 'react';

type ToastSeverity = 'info' | 'success' | 'warning' | 'error';

type ToastItem = {
  id: number;
  message: string;
  severity: ToastSeverity;
};

const TOAST_LIFETIME_MS = 3200;

export function GlobalToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const detail = (event as CustomEvent<{ message?: string; severity?: ToastSeverity }>).detail;
      const message = String(detail?.message || '').trim();
      if (!message) return;

      const id = Date.now() + Math.floor(Math.random() * 1000);
      const nextItem: ToastItem = {
        id,
        message,
        severity: detail?.severity || 'info'
      };

      setItems((current) => [...current, nextItem]);
      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== id));
      }, TOAST_LIFETIME_MS);
    }

    window.addEventListener('sc:toast', handleToast as EventListener);
    return () => {
      window.removeEventListener('sc:toast', handleToast as EventListener);
    };
  }, []);

  if (!items.length) return null;

  return (
    <div className="rf-toast-host" aria-live="polite" aria-atomic="true">
      {items.map((item) => (
        <div key={item.id} className={`rf-toast rf-toast--${item.severity}`}>
          {item.message}
        </div>
      ))}
    </div>
  );
}
