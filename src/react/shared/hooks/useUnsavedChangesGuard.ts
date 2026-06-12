import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Hook to guard against leaving a page with unsaved changes.
 * Returns the blocker object which should be passed to UnsavedChangesModal
 * 
 * @param isDirty Whether the form/page has unsaved changes
 * @param message Message for the native beforeunload alert
 */
export function useUnsavedChangesGuard(isDirty: boolean, message = 'Você tem alterações não salvas. Deseja realmente sair?') {
  // Block React Router navigation
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  // Block native browser navigation/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);

  return blocker;
}
