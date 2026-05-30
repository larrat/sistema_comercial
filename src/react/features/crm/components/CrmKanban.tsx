import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCrmData } from '../hooks/useCrmData';
import { useCrmMutations } from '../hooks/useCrmMutations';
import { useContratosMutations } from '../../contratos/hooks/useContratosMutations';
import type { CrmEstagio, CrmOportunidade } from '../types';
import { LucidePhone, LucideMapPin, LucideDollarSign, LucideCalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLUMNS: { id: CrmEstagio; label: string; color: string }[] = [
  { id: 'novo', label: 'Novo Lead', color: 'border-blue-500/50' },
  { id: 'visita', label: 'Visita Técnica', color: 'border-amber-500/50' },
  { id: 'orcamento', label: 'Orçamento', color: 'border-purple-500/50' },
  { id: 'negociacao', label: 'Negociação', color: 'border-pink-500/50' },
  { id: 'fechado', label: 'Contrato Fechado', color: 'border-emerald-500/50' },
  { id: 'perdido', label: 'Perdido', color: 'border-rose-500/50' },
];

export function CrmKanban() {
  const { data: oportunidades = [], isLoading } = useCrmData();
  const { updateEstagio } = useCrmMutations();
  const { createContrato, isCreatingContrato } = useContratosMutations();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Carregando funil...</div>;
  }

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = async (e: React.DragEvent, newEstagio: CrmEstagio) => {
    e.preventDefault();
    if (!draggedId) return;

    const op = oportunidades.find((o) => o.id === draggedId);
    if (op && op.estagio !== newEstagio) {
      await updateEstagio({ id: draggedId, estagio: newEstagio });
    }
    setDraggedId(null);
  };

  const handleGerarContrato = async (op: CrmOportunidade) => {
    if (!op.cliente_id) {
      toast.error('Vincule um cliente à oportunidade antes de gerar contrato.');
      return;
    }
    try {
      const c = await createContrato({
        cliente_id: op.cliente_id,
        oportunidade_id: op.id,
        titulo: `Contrato Reforma: ${op.nome_lead}`,
        valor_total: Number(op.valor_estimado) || 0,
      });
      navigate(`/app/contratos/${c.id}`);
    } catch (e) {
      // toast is already handled in mutation
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-4 pt-2">
      {COLUMNS.map((col) => {
        const columnOps = oportunidades.filter((o) => o.estagio === col.id);
        const columnTotal = columnOps.reduce((acc, curr) => acc + Number(curr.valor_estimado || 0), 0);

        return (
          <div
            key={col.id}
            className="flex w-[320px] shrink-0 flex-col rounded-xl bg-slate-900/50 p-3 border border-white/5 backdrop-blur-md"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column Header */}
            <div className={`mb-4 border-b-2 pb-2${col.color}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-slate-200">{col.label}</h3>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-400">
                  {columnOps.length}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500 font-medium">
                {formatCurrency(columnTotal)}
              </div>
            </div>

            {/* Column Body / Cards */}
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
              <AnimatePresence>
                {columnOps.map((op) => (
                  <motion.div
                    layout
                    layoutId={op.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={op.id}
                    draggable
                    onDragStart={() => handleDragStart(op.id)}
                    onDragEnd={() => setDraggedId(null)}
                    className="group relative cursor-grab rounded-lg border border-white/10 bg-[#0f172a] p-4 shadow-lg active:cursor-grabbing hover:border-teal-500/50 hover:bg-slate-800 transition-colors"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <h4 className="font-semibold text-slate-100">{op.nome_lead}</h4>
                    </div>

                    {op.endereco_obra && (
                      <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                        <LucideMapPin className="h-3 w-3" />
                        <span className="truncate">{op.endereco_obra}</span>
                      </div>
                    )}
                    
                    {op.telefone && (
                      <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                        <LucidePhone className="h-3 w-3" />
                        <span>{op.telefone}</span>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                        <LucideDollarSign className="h-3 w-3" />
                        {formatCurrency(Number(op.valor_estimado))}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <LucideCalendarClock className="h-3 w-3" />
                        {format(new Date(op.criado_em), "dd MMM", { locale: ptBR })}
                      </div>
                    </div>

                    {op.estagio === 'fechado' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleGerarContrato(op); }}
                        disabled={isCreatingContrato}
                        className="mt-3 w-full rounded-lg bg-teal-500/10 py-1.5 text-[11px] font-bold text-teal-400 hover:bg-teal-500/20 hover:text-white transition-colors"
                      >
                        Gerar Contrato
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {columnOps.length === 0 && (
                <div className="mt-4 text-center text-xs text-slate-600 border-2 border-dashed border-slate-700/50 rounded-lg py-8">
                  Arraste cards para cá
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
