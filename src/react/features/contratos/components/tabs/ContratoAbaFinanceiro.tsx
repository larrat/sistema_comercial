import { BarChart3, AlertTriangle, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { Button, Card, EmptyState } from '../../../../shared/ui';
import { fmtBRL } from '../../../../shared/lib/formatters';

type Props = {
  contrato: any;
  valorContratadoTotal: number;
  totalCustosReal: number;
  margemRealEst: number;
  pacingPercentual: number;
  despesasApropriadas: any[];
  totalMaoDeObraTerceiros: number;
  ordensServico: any[];
  newAditivoTitle: string;
  setNewAditivoTitle: (val: string) => void;
  newAditivoValue: number;
  setNewAditivoValue: (val: number) => void;
  handleAddAditivo: (e: React.FormEvent) => void;
  aditivos: any[];
};

export function ContratoAbaFinanceiro({
  contrato,
  valorContratadoTotal,
  totalCustosReal,
  margemRealEst,
  pacingPercentual,
  despesasApropriadas,
  totalMaoDeObraTerceiros,
  ordensServico,
  newAditivoTitle,
  setNewAditivoTitle,
  newAditivoValue,
  setNewAditivoValue,
  handleAddAditivo,
  aditivos
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
      <div className="lg:col-span-2 space-y-6">
        
        {/* Executive Physical-Financial Dashboard */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 shadow-xl space-y-6">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3.5">
            <BarChart3 className="h-5 w-5 text-teal-400" />
            Painel Físico-Financeiro Executivo
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight block">Valor Inicial</span>
              <span className="text-base font-extrabold text-white">{fmtBRL(contrato.valor_total)}</span>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight block">Receita Total</span>
              <span className="text-base font-extrabold text-white">{fmtBRL(valorContratadoTotal)}</span>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight block">Custos Totais</span>
              <span className="text-base font-extrabold text-rose-400">{fmtBRL(totalCustosReal)}</span>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <span className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-tight block">Margem Estimada</span>
              <span className="text-base font-black text-emerald-400">{fmtBRL(margemRealEst)}</span>
            </div>
          </div>

          {/* Progress costs pacing */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400 uppercase">Pacing de Custo sobre Receita</span>
              <span className={`${pacingPercentual > 75 ? 'text-rose-400' : 'text-teal-400'}`}>{pacingPercentual.toFixed(1)}% consumido</span>
            </div>
            <div className="h-3 bg-black/40 rounded-full overflow-hidden relative">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  pacingPercentual > 75 ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-teal-500 to-emerald-500'
                }`}
                style={{ width: `${Math.min(100, pacingPercentual)}%` }}
              />
            </div>
            {pacingPercentual > 75 && (
              <div className="flex items-center gap-1.5 text-[10px] text-rose-400 font-bold uppercase mt-1">
                <AlertTriangle size={12} /> Alerta: Custos físicos excederam 75% da receita orçada!
              </div>
            )}
          </div>
        </div>

        {/* List of Appropriated Costs */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-2">
            <ClipboardList className="h-4.5 w-4.5 text-slate-500" />
            Custos e Insumos Apropriados a esta Obra
          </h3>

          {despesasApropriadas.length === 0 && totalMaoDeObraTerceiros === 0 ? (
            <EmptyState title="Nenhuma despesa ou repasse carimbado nesta obra." compact />
          ) : (
            <div className="space-y-3">
              {/* Material Purchases */}
              {despesasApropriadas.map(c => (
                <div key={c.id} className="flex justify-between items-center p-3 rounded-xl border border-white/5 bg-white/[0.01] text-xs">
                  <div>
                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider">COMPRA INSUMOS</span>
                    <div className="font-bold text-white mt-0.5">{c.fornecedor_nome}</div>
                    <div className="text-[10px] text-slate-500 font-semibold mt-1">Ref: #{c.id} • {format(new Date(c.criado_em), 'dd/MM/yyyy')}</div>
                  </div>
                  <span className="font-black text-rose-400">{fmtBRL(c.total)}</span>
                </div>
              ))}

              {/* Subcontractor repasses */}
              {ordensServico.filter(os => os.status === 'concluida' && os.valor_parceiro && os.valor_parceiro > 0).map(os => (
                <div key={os.id} className="flex justify-between items-center p-3 rounded-xl border border-white/5 bg-white/[0.01] text-xs">
                  <div>
                    <span className={`text-[9px] font-black uppercase tracking-wider ${os.is_garantia ? 'text-rose-400' : 'text-indigo-400'}`}>
                      {os.is_garantia ? 'MÃO DE OBRA (ASSISTÊNCIA / GARANTIA)' : 'MÃO DE OBRA TERCEIRIZADA'}
                    </span>
                    <div className="font-bold text-white mt-0.5">Repasse: OS-{os.titulo}</div>
                    <div className="text-[10px] text-slate-500 font-semibold mt-1">
                      {os.is_garantia ? 'OS de Garantia pós-obra concluída' : 'OS concluída • Medição aprovada'}
                    </div>
                  </div>
                  <span className="font-black text-rose-400">{fmtBRL(os.valor_parceiro || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar aditivos form */}
      <div className="space-y-6">
        <Card className="p-5 bg-slate-900/40 border-white/10 shadow-lg">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Lançar Termo Aditivo</h3>
          <form onSubmit={handleAddAditivo} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição da Alteração</label>
              <input 
                type="text" 
                placeholder="Ex: Instalação de Revestimento 3D Adicional"
                value={newAditivoTitle}
                onChange={(e) => setNewAditivoTitle(e.target.value)}
                className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor do Aditivo (R$)</label>
              <input 
                type="number" 
                placeholder="2500"
                value={newAditivoValue}
                onChange={(e) => setNewAditivoValue(Number(e.target.value))}
                className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
              />
            </div>
            <Button type="submit" variant="primary" className="w-full">Lançar Aditivo</Button>
          </form>
        </Card>

        {/* List of active aditivos */}
        <Card className="p-5 bg-slate-900/40 border-white/10 shadow-lg">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Histórico de Aditivos</h3>
          {aditivos.length === 0 ? (
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider py-4 text-center">Nenhum termo aditivo lançado.</div>
          ) : (
            <div className="space-y-2">
              {aditivos.map(a => (
                <div key={a.id} className="flex justify-between items-center text-xs p-2 rounded bg-black/20 border border-white/5">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-bold text-slate-300 truncate">{a.titulo}</div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{format(new Date(a.criado_em), 'dd/MM/yyyy')}</div>
                  </div>
                  <span className="font-extrabold text-emerald-400">+{fmtBRL(Number(a.valor))}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
