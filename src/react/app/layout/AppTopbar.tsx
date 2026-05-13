import { FilialSwitcher } from '../filial/FilialSwitcher';

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between px-8 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 shadow-sm">
      <div className="flex-1 max-w-md relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-[#C5A059] transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <input 
          type="text" 
          placeholder="Busca global de pedidos, clientes ou produtos... (Alt + K)" 
          className="block w-full pl-10 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-white/5 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] sm:text-sm text-white transition-all"
        />
      </div>
      
      <div className="flex items-center gap-6">
        <FilialSwitcher />
        <div className="flex items-center gap-3 pl-6 border-l border-white/10">
          <div className="w-9 h-9 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-[#C5A059] font-bold text-sm shadow-sm">
            US
          </div>
        </div>
      </div>
    </header>
  );
}
