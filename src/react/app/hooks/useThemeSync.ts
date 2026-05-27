import { useEffect } from 'react';
import { useUIStore } from '../useUIStore';

export function useThemeSync() {
  const { theme, setTheme } = useUIStore();

  // On mount, if no theme is strictly set in localStorage, check OS preference
  // Because we use persist, the default is 'dark' anyway, but let's be robust
  useEffect(() => {
    // Sincroniza com a tag HTML
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    
    // Fallback: se usar o Tailwind class based strategy também, toggle class 'dark'
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Optional: Listen to system changes if we wanted dynamic sync
  // useEffect(() => {
  //   const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  //   const handleChange = (e: MediaQueryListEvent) => {
  //     // Only apply if user hasn't forced a theme, but since we persist, we usually skip this
  //   };
  //   mediaQuery.addEventListener('change', handleChange);
  //   return () => mediaQuery.removeEventListener('change', handleChange);
  // }, []);
}
