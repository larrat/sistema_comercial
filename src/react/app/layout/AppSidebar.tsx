import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  Circle,
  DollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  TrendingUp,
  UserCheck,
  Users,
  type LucideIcon
} from 'lucide-react';

import { FilialSwitcher } from '../filial/FilialSwitcher';
import { useAuthStore } from '../useAuthStore';
import { useFilialStore } from '../useFilialStore';
import { useRoleStore } from '../useRoleStore';
import { useNavigationItems } from '../hooks/useNavigationItems';
import { useUIStore } from '../useUIStore';

const iconByPath: Record<string, LucideIcon> = {
  '/app/pdv': ShoppingCart,
  '/app/dashboard': LayoutDashboard,
  '/app/estoque': Package,
  '/app/cotacao': FileText,
  '/app/relatorios': BarChart3,
  '/app/campanhas': Megaphone,
  '/app/analytics': TrendingUp,
  '/app/clientes': Users,
  '/app/produtos': Tag,
  '/app/rcas': UserCheck,
  '/app/pedidos': ShoppingBag,
  '/app/receber': DollarSign,
  '/app/filiais': Building2,
  '/app/acessos': Shield
};

const groupColors: Record<string, string> = {
  'Operação': '#38bdf8', // sky-400
  'Cadastros': '#818cf8', // indigo-400
  'Vendas': '#34d399', // emerald-400
  'Financeiro': '#fbbf24', // amber-400
  'Administração': '#fb7185', // rose-400
};

export function AppSidebar() {
  const groups = useNavigationItems();
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearFilial = useFilialStore((s) => s.clearFilial);
  const clearRole = useRoleStore((s) => s.clearRole);
  const user = useAuthStore((s) => s.session?.user);
  const { sidebarCollapsed: collapsed, toggleSidebar } = useUIStore();
  const navigate = useNavigate();

  function handleLogout() {
    clearFilial();
    clearRole();
    clearSession();
    navigate('/login', { replace: true });
  }

  const userInitial = (user?.email as string || 'U').charAt(0).toUpperCase();
  const userName = (user?.email as string || 'Usuário').split('@')[0];

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 280 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col bg-[#0B0F1A] border-r border-slate-800/60 text-slate-300 z-40 relative shadow-2xl h-screen sticky top-0"
      aria-label="Navegação principal"
    >
      {/* Header / Logo */}
      <div className={`flex-shrink-0 flex items-center h-[88px] ${collapsed ? 'justify-center' : 'px-6 justify-between'}`}>
        <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'justify-center' : ''}`}>
          <motion.div 
            layout
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-xl border border-white/5 shrink-0"
          >
            <Store size={24} strokeWidth={2.5} />
          </motion.div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col min-w-0"
              >
                <span className="font-extrabold text-lg text-white tracking-tight leading-none">Nexus</span>
                <span className="text-[10px] font-bold text-[var(--color-brand-gold)] uppercase tracking-[0.25em] mt-1.5 opacity-80">Industrial</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!collapsed && (
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-800/50 text-slate-500 hover:text-slate-100 transition-all group shrink-0"
            onClick={toggleSidebar}
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      <div className={`px-4 pt-2 pb-6 ${collapsed ? 'px-2 flex justify-center' : ''}`}>
        <FilialSwitcher variant="dark" collapsed={collapsed} />
      </div>

      {collapsed && (
        <div className="flex justify-center pb-6">
          <button
            type="button"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-800/30 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-all border border-white/5 shadow-lg"
            onClick={toggleSidebar}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className={`flex-1 overflow-y-auto flex flex-col gap-8 scrollbar-hide ${collapsed ? 'items-center px-0' : 'px-4'} py-2`}>
        {groups.map((group) => (
          <div key={group.label} className={`flex flex-col gap-2 ${collapsed ? 'items-center w-full' : ''}`}>
            <AnimatePresence>
              {!collapsed && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 flex items-center gap-2"
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 whitespace-nowrap">
                    {group.label}
                  </span>
                  <div className="h-px bg-slate-800/40 w-full" />
                </motion.div>
              )}
            </AnimatePresence>
            {collapsed && <div className="h-px bg-slate-800/30 w-8 mb-1" />}

            <div className={`flex flex-col gap-1 ${collapsed ? 'items-center w-full' : ''}`}>
              {group.items.map((item) => {
                const Icon = iconByPath[item.path] ?? Circle;
                const [isHovered, setIsHovered] = useState(false);
                const gColor = groupColors[group.label] || 'var(--color-brand-gold)';

                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={({ isActive }) =>
                      `flex items-center rounded-xl transition-all duration-300 relative group
                      ${collapsed ? 'justify-center w-12 h-12' : 'gap-3 px-4 py-3 w-full'}
                      ${
                        isActive
                           ? 'text-white'
                           : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.div 
                            layoutId="active-pill"
                            className="absolute inset-0 bg-white/5 rounded-xl border border-white/5 shadow-inner"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          />
                        )}
                        
                        {isActive && (
                          <motion.div 
                            layoutId="active-bar"
                            className="absolute left-0 w-1 h-6 bg-[var(--color-brand-gold)] rounded-r-full shadow-[0_0_12px_var(--color-brand-gold)]"
                            style={{ backgroundColor: gColor, boxShadow: `0 0 12px ${gColor}` }}
                          />
                        )}

                        <Icon 
                          size={collapsed ? 24 : 20} 
                          strokeWidth={isActive ? 2.5 : 2} 
                          className={`flex-shrink-0 transition-all duration-300 relative z-10 ${
                            isActive 
                              ? '' 
                              : 'group-hover:scale-110 group-hover:text-slate-300'
                          }`}
                          style={{ 
                            color: isActive ? gColor : undefined,
                            filter: isActive ? `drop-shadow(0 0 8px ${gColor}66)` : undefined 
                          }}
                        />
                        
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              className={`truncate text-[14px] tracking-tight relative z-10 ${isActive ? 'font-bold' : 'font-medium'}`}
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {/* Tooltip Collapsed */}
                        <AnimatePresence>
                          {collapsed && isHovered && (
                            <motion.div
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 20 }}
                              exit={{ opacity: 0, x: 10 }}
                              className="absolute left-full ml-2 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xl border border-slate-700 whitespace-nowrap z-[100] pointer-events-none"
                            >
                              {item.label}
                              <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-800 border-l border-b border-slate-700 rotate-45" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / User Profile */}
      <div className={`flex-shrink-0 mt-auto border-t border-slate-800/40 bg-black/20 ${collapsed ? 'p-3' : 'p-4'}`}>
        {collapsed ? (
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-slate-800/40 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
            title="Sair da Conta"
          >
            <LogOut size={24} strokeWidth={2.5} />
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center border border-white/10 shadow-lg shrink-0">
                <span className="text-sm font-black text-white">{userInitial}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate capitalize">{userName}</span>
                <span className="text-[10px] font-medium text-slate-500 truncate">{(user?.email as string) || ''}</span>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-all group"
            >
              <LogOut size={16} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
              <span>Sair da Conta</span>
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
