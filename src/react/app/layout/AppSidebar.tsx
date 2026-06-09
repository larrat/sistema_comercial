import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
  PencilRuler,
  TrendingUp,
  UserCheck,
  Users,
  type LucideIcon
} from 'lucide-react';

import { useAuthStore } from '../useAuthStore';
import { useFilialStore } from '../useFilialStore';
import { useRoleStore } from '../useRoleStore';
import { useNavigationItems } from '../hooks/useNavigationItems';
import { useUIStore } from '../useUIStore';
import type { NavigationItem } from '../navigation/config';

const iconByPath: Record<string, LucideIcon> = {
  '/app/pdv': ShoppingCart,
  '/app/dashboard': LayoutDashboard,
  '/app/estoque': Package,
  '/app/orcamentos': FileText,
  '/app/cotacao': FileText,
  '/app/relatorios': BarChart3,
  '/app/campanhas': Megaphone,
  '/app/analytics': TrendingUp,
  '/app/agenda': CalendarDays,
  '/app/crm': Kanban,
  '/app/contratos': FileSignature,
  '/app/clientes': Users,
  '/app/produtos': Tag,
  '/app/rcas': UserCheck,
  '/app/pedidos': ShoppingBag,
  '/app/receber': DollarSign,
  '/app/filiais': Building2,
  '/app/acessos': Shield,
  '/app/caixa': DollarSign,
  '/app/compras': ShoppingBag,
  '/app/fiscal': FileText,
  '/app/arquitetura/levantamento': PencilRuler,
};

const groupColors: Record<string, string> = {
  'Vendas & CRM': '#34d399', // emerald-400
  'Gestão & Operação': '#38bdf8', // sky-400
  'Financeiro': '#fbbf24', // amber-400
  'Marketing & Dados': '#a78bfa', // purple-400
  'Cadastros': '#818cf8', // indigo-400
  'Configurações': '#fb7185', // rose-400
};

function SidebarNavItem({ 
  item, 
  collapsed, 
  groupLabel 
}: { 
  item: NavigationItem; 
  collapsed: boolean; 
  groupLabel: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = iconByPath[item.path] ?? Circle;
  const gColor = groupColors[groupLabel] || '#3b82f6';

  return (
    <NavLink
      to={item.path}
      viewTransition
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={({ isActive }) =>
        `flex items-center rounded-lg transition-all duration-200 relative group
        ${collapsed ? 'justify-center w-12 h-12 mx-auto' : 'gap-3 px-3 py-2.5 w-full'}
         ${
           isActive
             ? 'bg-white/10 text-white font-bold'
             : 'text-slate-400 hover:text-white'
         }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="active-marker"
              className="absolute left-0 w-1 h-5 rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.3)]"
              style={{ backgroundColor: gColor }}
            />
          )}

          {!isActive && isHovered && (
            <motion.div
              layoutId={`hover-bg-${groupLabel}`}
              className="absolute inset-0 bg-white/[0.03] rounded-lg border border-white/[0.02]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          )}

          <motion.div
            animate={{ 
              scale: isHovered ? 1.08 : 1,
              rotate: isHovered ? 2 : 0
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="flex-shrink-0 relative z-10"
          >
            <Icon
              size={collapsed ? 22 : 18}
              strokeWidth={isActive ? 2.5 : 2}
              className="transition-transform group-active:scale-95"
              style={{ color: isActive ? gColor : undefined }}
            />
          </motion.div>

          {!collapsed && (
            <motion.span 
              animate={{ x: isHovered ? 4 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="truncate text-[13px] tracking-tight relative z-10"
            >
              {item.label}
            </motion.span>
          )}

          <AnimatePresence>
            {collapsed && isHovered && (
              <motion.div
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 15 }}
                exit={{ opacity: 0, x: 5 }}
                className="absolute left-full ml-2 px-3 py-1.5 bg-slate-800 text-white text-[12px] font-bold rounded-lg shadow-2xl border border-slate-700 whitespace-nowrap z-[100] pointer-events-none"
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
  const location = useLocation();
  const [search, setSearch] = useState('');
  
  // Track expanded state for groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Initialize expanded groups based on current route
  useEffect(() => {
    if (search) return; // If searching, we handle expansion differently
    const newExpanded = { ...expandedGroups };
    let hasChanges = false;
    
    groups.forEach(group => {
      const isGroupActive = group.items.some(item => location.pathname.startsWith(item.path));
      if (isGroupActive && !expandedGroups[group.label]) {
        newExpanded[group.label] = true;
        hasChanges = true;
      }
    });
    
    if (hasChanges) setExpandedGroups(newExpanded);
  }, [location.pathname, groups, search]);

  // Auto-expand groups when searching
  useEffect(() => {
    if (!search) return;
    const newExpanded = { ...expandedGroups };
    groups.forEach(group => {
      const hasMatch = group.items.some(item => item.label.toLowerCase().includes(search.toLowerCase()));
      if (hasMatch) newExpanded[group.label] = true;
    });
    setExpandedGroups(newExpanded);
  }, [search, groups]);

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

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
      className="flex flex-col bg-surface-sidebar backdrop-blur-3xl border-r border-border-subtle text-text-secondary z-40 relative shadow-[10px_0_40px_-10px_rgba(0,0,0,0.05)] h-screen overflow-hidden"
      aria-label="Navegação principal"
    >
      {/* Header / Logo */}
      <div className={`flex-shrink-0 flex items-center h-[88px] ${collapsed ? 'justify-center' : 'px-6 justify-between'}`}>
        <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-white/10 shrink-0">
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
                <span className="font-extrabold text-lg text-text-primary tracking-tight leading-none uppercase">Nexus</span>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mt-1">Industrial</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!collapsed && (
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-active text-text-muted hover:text-text-primary transition-all shrink-0"
            onClick={toggleSidebar}
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>
      
      {/* Search Bar */}
      {!collapsed && (
        <div className="px-4 mb-4 mt-2">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" size={14} />
            <input 
              type="text"
              placeholder="Buscar menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-hover border border-border-subtle rounded-xl py-2.5 pl-11 pr-4 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all shadow-inner"
            />
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex justify-center pb-4 pt-2">
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface-hover hover:bg-surface-active border border-border-subtle text-text-muted hover:text-text-primary transition-all shadow-sm"
            onClick={toggleSidebar}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className={`flex-1 overflow-y-auto flex flex-col gap-2 scrollbar-hide ${collapsed ? 'items-center px-0 gap-4' : 'px-3'} py-2`}>
        {groups.map((group) => {
          const filteredItems = group.items.filter(item => 
            item.label.toLowerCase().includes(search.toLowerCase())
          );
          
          if (filteredItems.length === 0) return null;
          
          const isExpanded = !!expandedGroups[group.label] || collapsed;

          return (
            <div key={group.label} className={`shrink-0 flex flex-col ${collapsed ? 'items-center w-full' : 'bg-surface-hover rounded-xl overflow-hidden border border-border-subtle'}`}>
              {/* Group Header (Accordion Toggle) */}
              {!collapsed && (
                <button 
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-3 py-3 hover:bg-surface-active transition-colors"
                >
                  <span 
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: groupColors[group.label] || '#94a3b8' }}
                  >
                    {group.label}
                  </span>
                  <ChevronDown 
                    size={14} 
                    className={`text-text-muted transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
              )}
              
              {/* Divider for Collapsed Mode */}
              {collapsed && <div className="h-px bg-border-bold w-8 mb-2 shrink-0" />}

              {/* Group Items */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex flex-col gap-1 ${collapsed ? 'items-center w-full' : 'px-2 pb-2'}`}
                  >
                    {filteredItems.map((item) => (
                      <SidebarNavItem
                        key={item.id}
                        item={item}
                        collapsed={collapsed}
                        groupLabel={group.label}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Footer / User Profile */}
      <div className={`flex-shrink-0 mt-auto border-t border-border-bold bg-surface-card/60 backdrop-blur-xl ${collapsed ? 'p-3' : 'p-4'}`}>
        <div className={`flex flex-col gap-4 ${collapsed ? 'items-center' : ''}`}>
          {!collapsed && (
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center border border-border-subtle shrink-0 shadow-inner">
                <span className="text-sm font-bold text-white drop-shadow-md">{userInitial}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-text-primary truncate capitalize leading-none tracking-tight">{userName}</span>
                <span className="text-[10px] font-medium text-text-tertiary truncate mt-1.5">{(user?.email as string) || ''}</span>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 rounded-xl text-xs font-bold text-text-muted hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent transition-all group ${collapsed ? 'w-10 h-10 justify-center' : 'w-full px-3 py-2.5 justify-center'}`}
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
