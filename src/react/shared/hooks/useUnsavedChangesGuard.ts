import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Hook to guard against leaving a page with unsaved changes.
 * Integrates with both browser's beforeunload and React Router v7 useBlocker.
 * 
 * @param isDirty Whether the form/page has unsaved changes
 * @param message Optional custom message (browsers mostly ignore this nowadays, but good for internal use)
 */
export function useUnsavedChangesGuard(isDirty: boolean, message = 'Você tem alterações não salvas. Deseja realmente sair?') {
  // Block React Router navigation
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  // Handle in-app blocking alert
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm(message)) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, message]);

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
}
