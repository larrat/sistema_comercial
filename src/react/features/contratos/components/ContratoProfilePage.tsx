import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useContratoDetail, useOrdensServicoData } from '../hooks/useContratosData';
import { LucideArrowLeft, LucideHammer, LucideCalendar, LucideUser, LucidePlus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OrdemServicoModal } from './OrdemServicoModal';
import { AnalisadorContratoModal } from './AnalisadorContratoModal';
import { LucideBot } from 'lucide-react';

export function ContratoProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: contrato, isLoading } = useContratoDetail(id);
  const { data: ordensServico = [] } = useOrdensServicoData(id);
  
  const [isOsModalOpen, setIsOsModalOpen] = useState(false);
  const [isAnalisadorOpen, setIsAnalisadorOpen] = useState(false);

  if (isLoading) return <div className="p-8 text-slate-400">Carregando contrato...</div>;
  if (!contrato) return <div className="p-8 text-rose-400">Contrato não encontrado.</div>;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header Profile */}
      <div className="border-b border-white/5 bg-slate-900/50 px-6 py-6 pt-8">
        <button 
          onClick={() => navigate('/app/contratos')}
          className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-teal-400 transition-colors"
        >
          <LucideArrowLeft className="h-4 w-4" />
          Voltar para Contratos
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white mb-2">
              {contrato.titulo}
            </h1>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><LucideUser className="h-4 w-4" /> {contrato.cliente?.nome}</span>
              <span className="flex items-center gap-1.5"><LucideCalendar className="h-4 w-4" /> 
                {contrato.data_inicio ? format(new Date(contrato.data_inicio), 'dd/MM/yyyy') : '-'}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-1">Valor do Projeto</div>
            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(Number(contrato.valor_total))}</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ordens de Servico Panel */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-white/10 bg-slate-900/40 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] p-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <LucideHammer className="h-5 w-5 text-teal-500" />
                Ordens de Serviço (O.S.)
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsAnalisadorOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-400 hover:bg-indigo-500/20"
                >
                  <LucideBot className="h-3 w-3" />
                  Analisar Prazos (NLP)
                </button>
                <button 
                  onClick={() => setIsOsModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-500/10 px-3 py-1.5 text-xs font-bold text-teal-400 hover:bg-teal-500/20"
                >
                  <LucidePlus className="h-3 w-3" />
                  Nova O.S.
                </button>
              </div>
            </div>

            <div className="p-4">
              {ordensServico.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500 border border-dashed border-white/10 rounded-lg">
                  Nenhuma O.S. vinculada a este contrato ainda.
                </div>
              ) : (
                <div className="grid gap-3">
                  {ordensServico.map(os => (
                    <div key={os.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0f172a] p-4 hover:border-white/10 transition-colors">
                      <div>
                        <h4 className="font-bold text-slate-200">{os.titulo}</h4>
                        <p className="text-xs text-slate-500 mt-1">{os.descricao}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        os.status === 'concluida' ? 'bg-emerald-500/20 text-emerald-400' :
                        os.status === 'em_andamento' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {os.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Informações</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="font-medium text-white capitalize">{contrato.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Previsão Entrega</span>
                <span className="font-medium text-white">
                  {contrato.previsao_fim ? format(new Date(contrato.previsao_fim), 'dd/MM/yyyy') : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {isOsModalOpen && (
        <OrdemServicoModal 
          contratoId={contrato.id} 
          onClose={() => setIsOsModalOpen(false)} 
        />
      )}
      
      {isAnalisadorOpen && (
        <AnalisadorContratoModal 
          contratoId={contrato.id} 
          isOpen={isAnalisadorOpen} 
          onClose={() => setIsAnalisadorOpen(false)} 
        />
      )}
    </div>
  );
}
