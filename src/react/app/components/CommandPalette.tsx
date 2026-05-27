import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, Settings, Package, Search } from 'lucide-react';
import '../../styles.css';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-xl mx-auto overflow-hidden rounded-2xl bg-slate-900 border border-white/10 shadow-[0_0_40px_-10px_rgba(0,0,0,0.6)] animate-in zoom-in-95 slide-in-from-top-4">
        <Command className="flex flex-col w-full bg-transparent text-slate-200">
          <div className="flex items-center px-4 py-3 border-b border-white/10">
            <Search className="w-5 h-5 mr-3 text-slate-500" />
            <Command.Input
              placeholder="Digite um comando ou busque algo..."
              className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-500 text-sm h-10"
            />
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-hide">
            <Command.Empty className="py-6 text-center text-sm text-slate-500">
              Nenhum resultado encontrado.
            </Command.Empty>

            <Command.Group heading="Navegação" className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 py-3">
              <Command.Item
                onSelect={() => runCommand(() => navigate('/dashboard'))}
                className="flex items-center px-2 py-2 mt-1 text-sm rounded-lg cursor-pointer hover:bg-slate-800 aria-selected:bg-slate-800 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 mr-3 text-slate-400" />
                Dashboard Pilot
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/pedidos'))}
                className="flex items-center px-2 py-2 mt-1 text-sm rounded-lg cursor-pointer hover:bg-slate-800 aria-selected:bg-slate-800 transition-colors"
              >
                <ShoppingCart className="w-4 h-4 mr-3 text-slate-400" />
                Pedidos e Orçamentos
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/produtos'))}
                className="flex items-center px-2 py-2 mt-1 text-sm rounded-lg cursor-pointer hover:bg-slate-800 aria-selected:bg-slate-800 transition-colors"
              >
                <Package className="w-4 h-4 mr-3 text-slate-400" />
                Produtos
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/clientes'))}
                className="flex items-center px-2 py-2 mt-1 text-sm rounded-lg cursor-pointer hover:bg-slate-800 aria-selected:bg-slate-800 transition-colors"
              >
                <Users className="w-4 h-4 mr-3 text-slate-400" />
                Clientes
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Ações Rápidas" className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 py-3 mt-2 border-t border-white/5">
              <Command.Item
                onSelect={() => runCommand(() => navigate('/pedidos/novo'))}
                className="flex items-center px-2 py-2 mt-1 text-sm rounded-lg cursor-pointer hover:bg-teal-500/10 aria-selected:bg-teal-500/10 text-teal-400 transition-colors"
              >
                <ShoppingCart className="w-4 h-4 mr-3" />
                Novo Pedido / Orçamento
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </Command.Dialog>
  );
}
