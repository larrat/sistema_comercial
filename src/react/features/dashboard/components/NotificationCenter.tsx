import { useState, useRef, useEffect } from 'react';
import { Bell, AlertCircle, Zap, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGlobalAlerts } from '../hooks/useGlobalAlerts';
import { Button } from '../../../shared/ui';
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { alerts, total } = useGlobalAlerts();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          isOpen ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
        }`}
      >
        <Bell size={18} className={total > 0 ? 'animate-pulse' : ''} />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0f172a] shadow-lg">
            {total}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-80 bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-white/5"
          >
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notificações</span>
              {total > 0 && <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[8px] font-black uppercase tracking-tighter border border-rose-500/20">{total} Pendentes</span>}
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {alerts.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {alerts.map(alert => (
                    <div 
                      key={alert.id} 
                      className="p-4 hover:bg-white/[0.03] transition-colors group cursor-pointer"
                      onClick={() => {
                        navigate(alert.link);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${alert.tone === 'danger' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {alert.isPredictive ? <Zap size={14} /> : <AlertCircle size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-black text-white uppercase tracking-tight truncate">{alert.title}</span>
                            {alert.isPredictive && <span className="text-[8px] font-black bg-teal-500/10 text-teal-400 px-1 rounded border border-teal-500/20">AI</span>}
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{alert.desc}</p>
                          
                          <div className="mt-3 flex items-center gap-1 text-[9px] font-black text-teal-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            Tratar agora <ChevronRight size={10} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10">
                    <Bell size={20} className="text-emerald-500/30" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">Tudo limpo!</p>
                    <p className="text-[10px] text-slate-500 mt-1">Nenhum alerta crítico no momento.</p>
                  </div>
                </div>
              )}
            </div>

            {alerts.length > 0 && (
              <div className="p-3 bg-white/[0.02] border-t border-white/5">
                <Button 
                  variant="secondary" 
                  className="w-full !text-[9px] !py-1.5 !rounded-lg border-white/5"
                  onClick={() => {
                    navigate('/app/dashboard');
                    setIsOpen(false);
                  }}
                >
                  Ver Painel Completo
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
