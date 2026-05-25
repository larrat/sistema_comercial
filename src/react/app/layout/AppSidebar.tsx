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
  FileSignature,
  FileText,
  Kanban,
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
  '/app/crm': Kanban,
  '/app/contratos': FileSignature,
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

interface NavItem {
  id: string;
  label: string;
  path: string;
}

function SidebarNavItem({ 
  item, 
  collapsed, 
  groupLabel 
}: { 
  item: NavItem; 
  collapsed: boolean; 
  groupLabel: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = iconByPath[item.path] ?? Circle;
  const gColor = groupColors[groupLabel] || '#3b82f6';

  return (
    <NavLink
      to={item.path}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={({ isActive }) =>
        `flex items-center rounded-lg transition-all duration-200 relative group
        ${collapsed ? 'justify-center w-12 h-12' : 'gap-3 px-3 py-2.5 w-full'}
         ${
           isActive
             ? 'bg-teal-500/10 text-white font-bold'
             : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
         }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="active-marker"
              className="absolute left-0 w-1 h-5 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              style={{ backgroundColor: gColor }}
            />
          )}

          <Icon
            size={collapsed ? 24 : 18}
            strokeWidth={isActive ? 2.5 : 2}
            className="flex-shrink-0 relative z-10 transition-transform group-active:scale-95"
            style={{ color: isActive ? gColor : undefined }}
          />

          {!collapsed && (
            <span className="truncate text-[13px] tracking-tight relative z-10">
              {item.label}
            </span>
          )}

          <AnimatePresence>
            {collapsed && isHovered && (
              <motion.div
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 15 }}
                exit={{ opacity: 0, x: 5 }}
                className="absolute left-full ml-2 px-3 py-1.5 bg-slate-800 text-white text-[11px] font-bold rounded-md shadow-2xl border border-slate-700 whitespace-nowrap z-[100] pointer-events-none"
              >
                {item.label}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </NavLink>
  );
}

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
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col bg-surface-card/40 backdrop-blur-3xl border-r border-white/[0.04] text-slate-300 z-40 relative shadow-[10px_0_40px_-10px_rgba(0,0,0,0.5)] h-screen overflow-hidden"
      aria-label="Navegação principal"
    >
      {/* Header / Logo */}
      <div className={`flex-shrink-0 flex items-center h-[88px] ${collapsed ? 'justify-center' : 'px-6 justify-between'}`}>
        <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] border border-white/10 shrink-0">
            <Store size={22} strokeWidth={2.5} />
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col min-w-0"
              >
                <span className="font-extrabold text-lg text-white tracking-tight leading-none uppercase">Nexus</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Industrial</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!collapsed && (
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-100 transition-all shrink-0"
            onClick={toggleSidebar}
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>
      {/* Search Bar */}
      {!collapsed && (
        <div className="px-4 mb-6 mt-2">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-400 transition-colors" size={14} />
            <input 
              type="text"
              placeholder="Buscar menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/20 border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all shadow-inner"
            />
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex justify-center pb-4 pt-2">
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.02] text-slate-400 hover:text-white transition-all shadow-sm"
            onClick={toggleSidebar}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className={`flex-1 overflow-y-auto flex flex-col gap-6 scrollbar-hide ${collapsed ? 'items-center px-0' : 'px-4'} py-2`}>
        {groups.map((group) => {
          const filteredItems = group.items.filter(item => 
            item.label.toLowerCase().includes(search.toLowerCase())
          );
          
          if (filteredItems.length === 0) return null;

          return (
            <div key={group.label} className={`flex flex-col gap-2 ${collapsed ? 'items-center w-full' : ''}`}>
              {!collapsed && (
                <div className="px-3 flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">
                    {group.label}
                  </span>
                  <div className="h-px bg-slate-800/50 w-full" />
                </div>
              )}
              {collapsed && <div className="h-px bg-slate-800/30 w-8 mb-1" />}

              <div className={`flex flex-col gap-0.5 ${collapsed ? 'items-center w-full' : ''}`}>
                {filteredItems.map((item) => (
                  <SidebarNavItem
                    key={item.id}
                    item={item}
                    collapsed={collapsed}
                    groupLabel={group.label}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer / User Profile */}
      <div className={`flex-shrink-0 mt-auto border-t border-white/[0.04] bg-black/20 backdrop-blur-xl ${collapsed ? 'p-3' : 'p-4'}`}>
        <div className={`flex flex-col gap-4 ${collapsed ? 'items-center' : ''}`}>
          {!collapsed && (
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center border border-white/10 shrink-0 shadow-inner">
                <span className="text-sm font-bold text-white drop-shadow-md">{userInitial}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate capitalize leading-none tracking-tight">{userName}</span>
                <span className="text-[10px] font-medium text-slate-400 truncate mt-1.5">{(user?.email as string) || ''}</span>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent transition-all group ${collapsed ? 'w-10 h-10 justify-center' : 'w-full px-3 py-2.5 justify-center'}`}
            title={collapsed ? "Encerrar Sessão" : undefined}
          >
            <LogOut size={collapsed ? 18 : 16} strokeWidth={2.5} className="shrink-0" />
            {!collapsed && <span>Encerrar Sessão</span>}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
