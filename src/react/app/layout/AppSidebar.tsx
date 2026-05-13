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
  Search,
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
  const [search, setSearch] = useState('');

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
      className="flex flex-col bg-[#080B14] border-r border-white/5 text-slate-300 z-40 relative shadow-2xl h-screen sticky top-0 overflow-hidden"
      aria-label="Navegação principal"
    >
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

      {/* Header / Logo */}
      <div className={`flex-shrink-0 flex items-center h-[96px] relative z-10 ${collapsed ? 'justify-center' : 'px-6 justify-between'}`}>
        <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'justify-center' : ''}`}>
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-white/10 shrink-0"
          >
            <Store size={26} strokeWidth={2.5} />
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
                <span className="font-black text-xl text-white tracking-tighter leading-none italic uppercase">Nexus</span>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-1 opacity-90">Industrial</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!collapsed && (
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all border border-white/5 shrink-0"
            onClick={toggleSidebar}
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Search Section */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-4 mb-6 relative z-10"
          >
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={14} />
              <input 
                type="text"
                placeholder="Buscar menu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white/[0.05] transition-all"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`px-4 pb-6 relative z-10 ${collapsed ? 'px-2 flex justify-center' : ''}`}>
        <FilialSwitcher variant="dark" collapsed={collapsed} />
      </div>

      {collapsed && (
        <div className="flex justify-center pb-6">
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5 shadow-xl"
            onClick={toggleSidebar}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className={`flex-1 overflow-y-auto flex flex-col gap-6 scrollbar-hide relative z-10 ${collapsed ? 'items-center px-0' : 'px-4'} py-2`}>
        {groups.map((group) => {
          const filteredItems = group.items.filter(item => 
            item.label.toLowerCase().includes(search.toLowerCase())
          );
          
          if (filteredItems.length === 0) return null;

          return (
            <div key={group.label} className={`flex flex-col gap-3 ${collapsed ? 'items-center w-full' : ''}`}>
              {!collapsed && (
                <div className="px-3 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">
                    {group.label}
                  </span>
                </div>
              )}
              {collapsed && <div className="h-px bg-white/5 w-8 mb-1" />}

              <div className={`flex flex-col gap-1 p-1 rounded-2xl ${collapsed ? 'items-center w-full' : 'bg-white/[0.02] border border-white/5'}`}>
                {filteredItems.map((item) => {
                  const Icon = iconByPath[item.path] ?? Circle;
                  const [isHovered, setIsHovered] = useState(false);
                  const gColor = groupColors[group.label] || '#3b82f6';

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
                             : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.div 
                              layoutId="active-pill"
                              className="absolute inset-0 rounded-xl border border-white/10 shadow-lg"
                              style={{ 
                                background: `linear-gradient(135deg, ${gColor}15 0%, ${gColor}05 100%)`,
                              }}
                              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                          )}
                          
                          {isActive && (
                            <motion.div 
                              layoutId="active-glow"
                              className="absolute inset-0 blur-md opacity-20 rounded-xl"
                              style={{ backgroundColor: gColor }}
                            />
                          )}

                          <Icon 
                            size={collapsed ? 24 : 20} 
                            strokeWidth={isActive ? 2.5 : 2} 
                            className={`flex-shrink-0 transition-all duration-500 relative z-10 ${
                              isActive ? 'scale-110' : 'group-hover:scale-110'
                            }`}
                            style={{ 
                              color: isActive ? gColor : undefined,
                              filter: isActive ? `drop-shadow(0 0 10px ${gColor}88)` : undefined 
                            }}
                          />
                          
                          <AnimatePresence>
                            {!collapsed && (
                              <motion.span 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className={`truncate text-[13px] tracking-wide relative z-10 ${isActive ? 'font-bold' : 'font-semibold'}`}
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
                                animate={{ opacity: 1, x: 24 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="absolute left-full ml-2 px-3 py-2 bg-slate-900 text-white text-xs font-black rounded-lg shadow-2xl border border-white/10 whitespace-nowrap z-[100] pointer-events-none uppercase tracking-widest"
                              >
                                {item.label}
                                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-white/10 rotate-45" />
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
          );
        })}
      </nav>

      {/* Footer / User Profile */}
      <div className={`flex-shrink-0 mt-auto relative z-10 ${collapsed ? 'p-3' : 'p-4'}`}>
        {!collapsed && (
          <div className="mb-4 p-3 rounded-2xl bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Shield size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white leading-none">Suporte Nexus</span>
                <span className="text-[9px] font-medium text-slate-500 mt-1">Central de Ajuda</span>
              </div>
            </div>
          </div>
        )}

        <div className={`rounded-2xl bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.05] ${collapsed ? 'p-1' : 'p-3'}`}>
          {collapsed ? (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-12 h-12 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all shadow-lg"
              title="Sair da Conta"
            >
              <LogOut size={22} strokeWidth={2.5} />
            </button>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 px-1">
                <motion.div 
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center border border-white/10 shadow-xl shrink-0"
                >
                  <span className="text-sm font-black text-white">{userInitial}</span>
                </motion.div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate capitalize leading-tight">{userName}</span>
                  <span className="text-[10px] font-medium text-slate-500 truncate mt-0.5">{(user?.email as string) || ''}</span>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 border border-transparent hover:border-rose-400/20 transition-all group"
              >
                <LogOut size={14} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
                <span>Encerrar Sessão</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
