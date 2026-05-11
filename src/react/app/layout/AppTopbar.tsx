import { FilialSwitcher } from '../filial/FilialSwitcher';

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end px-6 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Placeholder para futuras ações como Notificações ou Perfil */}
        <FilialSwitcher />
      </div>
    </header>
  );
}
