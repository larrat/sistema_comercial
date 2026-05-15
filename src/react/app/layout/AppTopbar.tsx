import { useRef } from 'react';
import { FilialSwitcher } from '../filial/FilialSwitcher';
import { useHotkeys } from '../../shared/hooks/useHotkeys';
import { NotificationCenter } from '../../features/dashboard/components/NotificationCenter';

export function AppTopbar() {
  const searchRef = useRef<HTMLInputElement>(null);

  useHotkeys('Alt+k', () => {
    searchRef.current?.focus();
  });

  return (
    <header className="sticky top-0 z-30 w-full flex h-16 items-center justify-between px-8 bg-surface-card/60 backdrop-blur-2xl border-b border-white/5 shadow-xl">
      <div className="flex-1 max-w-lg relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-cyan-400 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <input 
          ref={searchRef}
          type="text" 
          placeholder="Busca global... (Alt + K)" 
          className="block w-full pl-11 pr-4 py-2 border border-white/5 rounded-xl leading-5 bg-black/20 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 focus:border-cyan-500/50 sm:text-sm text-white transition-all shadow-inner"
        />
      </div>
      
      <div className="flex items-center gap-8">
        <NotificationCenter />
        
        <div className="flex items-center gap-6 border-l border-white/10 pl-8">
          <FilialSwitcher isTopbar={true} />
          
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 font-black text-sm shadow-sm">
            US
          </div>
        </div>
      </div>
    </header>
  );
}
