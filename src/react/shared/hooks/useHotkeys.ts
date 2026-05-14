import { useEffect, useCallback } from 'react';

type HotkeyHandler = (event: KeyboardEvent) => void;

export function useHotkeys(key: string, handler: HotkeyHandler, deps: any[] = []) {
  const memoizedHandler = useCallback(handler, deps);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Normalizar tecla (ex: 'F2', 'Alt+N', 'Control+K')
      const parts = [];
      if (event.ctrlKey) parts.push('Control');
      if (event.altKey) parts.push('Alt');
      if (event.shiftKey) parts.push('Shift');
      if (event.metaKey) parts.push('Meta');

      const keyName = event.key === ' ' ? 'Space' : event.key;
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(keyName)) {
        parts.push(keyName);
      }

      const pressed = parts.join('+');
      if (pressed.toLowerCase() === key.toLowerCase()) {
        event.preventDefault();
        memoizedHandler(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, memoizedHandler]);
}
