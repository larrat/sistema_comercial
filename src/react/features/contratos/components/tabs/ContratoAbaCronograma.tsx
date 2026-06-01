import { Calendar, DollarSign, Check } from 'lucide-react';
import { format } from 'date-fns';
import { Button, Card, EmptyState } from '../../../../shared/ui';
import { fmtBRL } from '../../../../shared/lib/formatters';

type Props = {
  cronograma: any[];
  faturamentos: any[];
  newPhaseTitle: string;
  setNewPhaseTitle: (val: string) => void;
  newPhaseStart: string;
  setNewPhaseStart: (val: string) => void;
  newPhaseEnd: string;
  setNewPhaseEnd: (val: string) => void;
  newPhasePrecedente: string;
  setNewPhasePrecedente: (val: string) => void;
  newPhaseValorFaturamento: number;
  setNewPhaseValorFaturamento: (val: number) => void;
  handleAddPhase: (e: React.FormEvent) => void;
  updateCronogramaProgressMutation: any;
  faturarMarcoMutation: any;
};

export function ContratoAbaCronograma({
  cronograma,
  faturamentos,
  newPhaseTitle,
  setNewPhaseTitle,
  newPhaseStart,
  setNewPhaseStart,
  newPhaseEnd,
  setNewPhaseEnd,
  newPhasePrecedente,
  setNewPhasePrecedente,
  newPhaseValorFaturamento,
  setNewPhaseValorFaturamento,
  handleAddPhase,
  updateCronogramaProgressMutation,
  faturarMarcoMutation
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-xl">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 mb-6">
            <Calendar className="h-5 w-5 text-teal-400" />
            Visualizador Físico do Cronograma (Fases da Obra)
          </h2>

          {cronograma.length === 0 ? (
            <EmptyState title="Nenhuma fase ou marco físico lançado no cronograma." compact />
          ) : (
            <div className="space-y-5">
              {cronograma.map(fase => (
                <div key={fase.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-tight">{fase.titulo}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-teal-400">{fase.percentual_conclusao}% concluído</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={fase.percentual_conclusao}
                        onChange={(e) => updateCronogramaProgressMutation.mutate({ phaseId: fase.id, progress: Number(e.target.value) })}
                        className="w-24 accent-teal-400"
                      />
                    </div>
                  </div>

                  {/* Visual Gantt Bar */}
                  <div className="h-2.5 bg-black/40 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${fase.percentual_conclusao}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 mt-2 border-t border-white/5 pt-2">
                    <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold">
                      <span>Início: {fase.data_inicio ? format(new Date(fase.data_inicio), 'dd/MM/yyyy') : '-'}</span>
                      <span>Fim: {fase.data_fim ? format(new Date(fase.data_fim), 'dd/MM/yyyy') : '-'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {fase.valor_faturamento > 0 && (
                        <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1">
                          <DollarSign size={10} />
                          Faturamento: {fmtBRL(Number(fase.valor_faturamento))}
                        </span>
                      )}
                      {fase.percentual_conclusao === 100 && fase.valor_faturamento > 0 && (
                        <>
                          {faturamentos.find((f: any) => f.cronograma_id === fase.id) ? (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md">
                              <Check size={10} /> Faturado ✓
                            </span>
                          ) : (
                            <button
                              onClick={() => faturarMarcoMutation.mutate({
                                cronogramaId: fase.id,
                                valor: Number(fase.valor_faturamento),
                                tituloFase: fase.titulo
                              })}
                              disabled={faturarMarcoMutation.isPending}
                              className="flex items-center gap-1 rounded-md bg-gradient-to-r from-teal-500 to-indigo-600 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                              {faturarMarcoMutation.isPending ? '...' : 'Faturar Marco'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <Card className="p-5 bg-slate-900/40 border-white/10 shadow-lg">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Adicionar Nova Fase</h3>
          <form onSubmit={handleAddPhase} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome da Fase</label>
              <input 
                type="text" 
                placeholder="Ex: Demolição, Pintura, Reboco"
                value={newPhaseTitle}
                onChange={(e) => setNewPhaseTitle(e.target.value)}
                className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Início</label>
                <input 
                  type="date" 
                  value={newPhaseStart}
                  onChange={(e) => setNewPhaseStart(e.target.value)}
                  className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Previsão Fim</label>
                <input 
                  type="date" 
                  value={newPhaseEnd}
                  onChange={(e) => setNewPhaseEnd(e.target.value)}
                  className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Precedente (Depende de)</label>
              <select
                value={newPhasePrecedente}
                onChange={(e) => setNewPhasePrecedente(e.target.value)}
                className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white appearance-none"
              >
                <option value="">Nenhuma fase anterior</option>
                {cronograma.map(c => (
                  <option key={c.id} value={c.id}>{c.titulo}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <DollarSign size={12} className="text-slate-500" /> Valor do Faturamento (R$)
              </label>
              <input 
                type="number" 
                placeholder="Ex: 5000"
                value={newPhaseValorFaturamento || ''}
                onChange={(e) => setNewPhaseValorFaturamento(Number(e.target.value))}
                className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
              />
            </div>
            <Button type="submit" variant="primary" className="w-full">Lançar Fase</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
