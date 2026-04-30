import { useEffect } from 'react';

type KeyboardShortcut = {
  key: string;
  handler: (event: KeyboardEvent) => void;
  enabled?: boolean;
  preventDefault?: boolean;
  allowInInput?: boolean;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = String(target.tagName || '').toLowerCase();
  if (target.isContentEditable) return true;
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;
        if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) continue;
        if (!shortcut.allowInInput && isTypingTarget(event.target)) continue;

        if (shortcut.preventDefault) event.preventDefault();
        shortcut.handler(event);
        break;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcuts]);
}
