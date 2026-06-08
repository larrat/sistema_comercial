import { useState } from 'react';
import { toast } from 'sonner';
import { useFilialStore } from '../../../app/useFilialStore';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { crmService } from '../../clientes/services/crmService';
import { Button, Badge } from '../../../shared/ui';
import { AlertCircle, Bell, ChevronRight, RefreshCw, Settings, Zap } from 'lucide-react';

export function CrmAutomationCard() {
  const [active, setActive] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const filialId = useFilialStore((s) => s.filialId);
  const { token } = useApiContext();

  const handleProcess = async () => {
    if (!filialId || !token) return;
    setIsProcessing(true);
    try {
      const total = await crmService.processarRegrasCobrança(token, filialId);
      toast.success(`${total} notificações de cobrança processadas.`);
    } catch (err) {
      toast.error('Erro ao processar cobranças.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rf-card-premium p-6 border-white/5 bg-gradient-to-br from-indigo-950/20 to-slate-900/50 transition-all duration-300 hover:scale-[1.02] hover:border-white/10 hover:shadow-indigo-500/5 active:scale-[0.99]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Régua de Cobrança Automática</h3>
            <p className="mt-0.5 text-sm font-medium text-slate-400">Nexus CRM</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Status</span>
            <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
          </div>
          <Button size="sm" variant="secondary" className="!p-2 rounded-xl">
            <Settings size={14} />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell size={14} className="text-amber-400" />
            <span className="text-xs font-medium text-slate-300">Vencimento em 2 dias</span>
          </div>
          <Badge variant="slate">WHATSAPP</Badge>
        </div>
        <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle size={14} className="text-rose-400" />
            <span className="text-xs font-medium text-slate-300">Atraso após 3 dias</span>
          </div>
          <Badge variant="slate">WHATSAPP + EMAIL</Badge>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
        <Button size="sm" variant="ghost" className="text-indigo-400 hover:text-indigo-300 gap-1 !text-[10px]" onClick={handleProcess} loading={isProcessing}>
          <RefreshCw size={12} className={isProcessing ? 'animate-spin' : ''} />
          Processar Agora
        </Button>
        <Button size="sm" variant="ghost" className="text-indigo-400 hover:text-indigo-300 gap-1 !text-[10px]">
          Ver Relatório <ChevronRight size={12} />
        </Button>
      </div>
    </div>
  );
}
