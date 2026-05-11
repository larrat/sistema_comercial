import { create } from 'zustand';

export type ToastSeverity = 'info' | 'success' | 'warning' | 'error';

export type ToastItem = {
  id: number;
  message: string;
  severity: ToastSeverity;
};

export type LoadingState = {
  active: boolean;
  label: string;
};

type ToastStoreState = {
  toasts: ToastItem[];
  loading: LoadingState;
};

type ToastStoreActions = {
  addToast: (message: string, severity?: ToastSeverity) => void;
  dismissToast: (id: number) => void;
  setLoading: (active: boolean, label?: string) => void;
};

const TOAST_LIFETIME_MS = 3200;
const DEFAULT_LABEL = 'Carregando…';

export const useToastStore = create<ToastStoreState & ToastStoreActions>((set) => ({
  toasts: [],
  loading: { active: false, label: DEFAULT_LABEL },

  addToast: (message, severity = 'info') => {
    const trimmed = String(message || '').trim();
    if (!trimmed) return;

    const id = Date.now() + Math.floor(Math.random() * 1000);
    const item: ToastItem = { id, message: trimmed, severity };

    set((state) => ({ toasts: [...state.toasts, item] }));

    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, TOAST_LIFETIME_MS);
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  setLoading: (active, label = DEFAULT_LABEL) => {
    set({ loading: { active, label } });
  }
}));

/** Hook de conveniência para adicionar toasts de qualquer componente. */
export function useToast() {
  const addToast = useToastStore((state) => state.addToast);
  return {
    info: (message: string) => addToast(message, 'info'),
    success: (message: string) => addToast(message, 'success'),
    warning: (message: string) => addToast(message, 'warning'),
    error: (message: string) => addToast(message, 'error'),
    add: addToast
  };
}
