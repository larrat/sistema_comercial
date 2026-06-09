import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFilialStore } from '../../../app/useFilialStore';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { crmService } from '../../clientes/services/crmService';
import { Button, Badge, StatusBadge } from '../../../shared/ui';
import { AlertCircle, Bell, ChevronRight, Clock, RefreshCw, Settings, Zap, CheckCircle2 } from 'lucide-react';

const TIPO_LABEL: Record<string, { label: string; tone: 'warning' | 'danger' | 'info' }> = {
  vencimento_proximo: { label: 'Venc. Próximo', tone: 'warning' },
  vencimento_hoje:    { label: 'Vence Hoje',    tone: 'danger' },
  atraso:             { label: 'Em Atraso',      tone: 'danger' },
};

export function CrmAutomationCard() {
  const [showLog, setShowLog] = useState(false);
  const filialId = useFilialStore((s) => s.filialId);
  const { token } = useApiContext();
  const queryClient = useQueryClient();

  // Busca log de cobranças
  const { data: logs = [], isLoading: loadingLog } = useQuery({
    queryKey: ['cobranca-log', filialId],
    queryFn: () => crmService.getCobrancaLog(token!, filialId!),
    enabled: !!token && !!filialId && showLog,
    staleTime: 30_000,
  });

  // Mutation: processar régua
  const { mutate: processar, isPending: isProcessing } = useMutation({
    mutationFn: () => crmService.processarRegrasCobrança(token!, filialId!),
    onSuccess: (result) => {
      toast.success(
        `Régua processada: ${result.criados} notificações geradas, ${result.ignorados} já existiam.`
      );
      void queryClient.invalidateQueries({ queryKey: ['cobranca-log', filialId] });
    },
    onError: () => toast.error('Erro ao processar régua de cobrança.'),
  });

  const handleProcess = () => {
    if (!filialId || !token) return;
    processar();
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
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          <Button size="sm" variant="secondary" className="!p-2 rounded-xl" title="Configurações">
            <Settings size={14} />
          </Button>
        </div>
      </div>

      {/* Regras configuradas */}
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

      {/* Log de cobranças */}
      {showLog && (
        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
          {loadingLog && (
            <p className="text-xs text-slate-500 italic text-center py-2">Carregando log…</p>
          )}
          {!loadingLog && logs.length === 0 && (
            <p className="text-xs text-slate-500 italic text-center py-2">Nenhum registro de cobrança ainda.</p>
          )}
          {logs.map((log) => (
            <div key={log.id} className="p-2.5 bg-white/[0.03] rounded-lg border border-white/5 flex items-start gap-2.5">
              <div className="mt-0.5 shrink-0">
                {log.status === 'enviado'
                  ? <CheckCircle2 size={12} className="text-emerald-400" />
                  : log.status === 'erro'
                  ? <AlertCircle size={12} className="text-rose-400" />
                  : <Clock size={12} className="text-amber-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-200 truncate">{log.cliente}</p>
                <p className="text-[10px] text-slate-500 truncate">{log.mensagem}</p>
              </div>
              <StatusBadge tone={TIPO_LABEL[log.tipo_evento]?.tone ?? 'info'} className="shrink-0 !text-[9px]">
                {TIPO_LABEL[log.tipo_evento]?.label ?? log.tipo_evento}
              </StatusBadge>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
        <Button
          size="sm"
          variant="ghost"
          className="text-indigo-400 hover:text-indigo-300 gap-1 !text-[10px]"
          onClick={handleProcess}
          loading={isProcessing}
        >
          <RefreshCw size={12} className={isProcessing ? 'animate-spin' : ''} />
          Processar Agora
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-indigo-400 hover:text-indigo-300 gap-1 !text-[10px]"
          onClick={() => setShowLog((v) => !v)}
        >
          {showLog ? 'Ocultar Log' : 'Ver Relatório'} <ChevronRight size={12} />
        </Button>
      </div>
    </div>
  );
}
