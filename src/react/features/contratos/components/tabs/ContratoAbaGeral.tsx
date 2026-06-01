import { Bot, Hammer, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Badge, Card, EmptyState } from '../../../../shared/ui';
import { fmtBRL } from '../../../../shared/lib/formatters';
import type { OrdemServico, Contrato } from '../../types';

type Props = {
  contrato: Contrato;
  ordensServico: OrdemServico[];
  diarios: any[];
  setIsAnalisadorOpen: (open: boolean) => void;
  setIsOsModalOpen: (open: boolean) => void;
  setPagamentoOsSelected: (os: { id: string, titulo: string, valor: number }) => void;
  updateOSStatusMutation: any;
};

export function ContratoAbaGeral({
  contrato,
  ordensServico,
  diarios,
  setIsAnalisadorOpen,
  setIsOsModalOpen,
  setPagamentoOsSelected,
  updateOSStatusMutation
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 overflow-hidden shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] p-5">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Hammer className="h-5 w-5 text-teal-400" />
              Cronograma de Execução Física (O.S.)
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsAnalisadorOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-xs font-bold text-indigo-400 hover:bg-indigo-500/20 active:scale-[0.98] transition-all"
              >
                <Bot className="h-4 w-4" />
                Analisar Contrato (NLP)
              </button>
              <button 
                onClick={() => setIsOsModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 px-3.5 py-2 text-xs font-bold text-teal-400 hover:bg-teal-500/20 active:scale-[0.98] transition-all"
              >
                <Plus className="h-4 w-4" />
                Nova O.S.
              </button>
            </div>
          </div>

          <div className="p-5">
            {ordensServico.length === 0 ? (
              <EmptyState title="Nenhuma O.S. vinculada a este contrato ainda." compact />
            ) : (
              <div className="grid gap-4">
                {ordensServico.map(os => (
                  <div key={os.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.01] p-5 hover:border-white/10 transition-all hover:bg-white/[0.02]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black text-slate-500 uppercase">OS-{os.id.substring(0, 5)}</span>
                        {os.valor_parceiro && os.valor_parceiro > 0 ? (
                          <Badge variant="green">Parceiro: {fmtBRL(os.valor_parceiro)}</Badge>
                        ) : (
                          <Badge variant="slate">Sem repasse</Badge>
                        )}
                      </div>
                      <h4 className="font-bold text-white text-sm">{os.titulo}</h4>
                      <p className="text-xs text-slate-400 mt-1">{os.descricao}</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 self-end sm:self-center">
                      <div className="flex items-center gap-2">
                        {os.valor_parceiro && os.valor_parceiro > 0 && (
                          <button 
                            onClick={() => setPagamentoOsSelected({ id: os.id, titulo: os.titulo, valor: os.valor_parceiro! })}
                            className="text-[10px] font-black uppercase tracking-widest text-teal-400 border border-teal-500/30 px-2.5 py-1.5 rounded-lg hover:bg-teal-500/10 transition-colors"
                            title="Pagamentos / Adiantamentos da O.S."
                          >
                            Financeiro da OS
                          </button>
                        )}
                        <select
                          value={os.status}
                          onChange={(e) => updateOSStatusMutation.mutate({ osId: os.id, status: e.target.value as any })}
                          className="bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="agendada">Agendada</option>
                          <option value="em_andamento">Em Andamento</option>
                          <option value="concluida">Concluída</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        os.status === 'concluida' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        os.status === 'em_andamento' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-slate-500/10 text-slate-400 border-slate-400/20'
                      }`}>
                        {os.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="p-5 bg-slate-900/40 border-white/10 shadow-lg">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Informações Gerais</h3>
          <div className="space-y-4 text-xs font-bold">
            <div className="flex justify-between border-b border-white/5 pb-2.5">
              <span className="text-slate-500 uppercase tracking-tight">Status do Contrato</span>
              <span className="text-white capitalize">{contrato.status}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2.5">
              <span className="text-slate-500 uppercase tracking-tight">Previsão Conclusão</span>
              <span className="text-white">
                {contrato.previsao_fim ? format(new Date(contrato.previsao_fim), 'dd/MM/yyyy') : '-'}
              </span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2.5">
              <span className="text-slate-500 uppercase tracking-tight">Qtd Ordens Serviço</span>
              <span className="text-teal-400">{ordensServico.length} OS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 uppercase tracking-tight">Total Diários Registrados</span>
              <span className="text-indigo-400">{diarios.length} relatórios</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
