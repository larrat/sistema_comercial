import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { Camera, Calendar, CheckCircle2, Circle, HardHat, Building2, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function PortalObraPage() {
  const { obraId } = useParams();
  const [activeTab, setActiveTab] = useState<'rdo' | 'gantt'>('rdo');

  // Fetch Public Obra Data
  const { data: obra, isLoading, isError } = useQuery({
    queryKey: ['portal-obra', obraId],
    queryFn: async () => {
      const { url, key } = getSupabaseConfig();
      // Usamos a chave anon. RLs no banco precisariam permitir acesso se usássemos o id direto.
      // Para este protótipo premium, assumimos que as policies permitam leitura de obra pelo ID público.
      const res = await fetch(`${url}/rest/v1/contratos?id=eq.${obraId}&select=*,cliente:clientes(nome)`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      });
      if (!res.ok) throw new Error('Obra não encontrada');
      const data = await res.json();
      return data[0];
    },
    enabled: !!obraId
  });

  const { data: diarios = [] } = useQuery({
    queryKey: ['portal-diarios', obraId],
    queryFn: async () => {
      const { url, key } = getSupabaseConfig();
      const res = await fetch(`${url}/rest/v1/diario_obra?contrato_id=eq.${obraId}&order=data_registro.desc`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      });
      return res.ok ? await res.json() : [];
    },
    enabled: !!obraId
  });

  const { data: cronograma = [] } = useQuery({
    queryKey: ['portal-cronograma', obraId],
    queryFn: async () => {
      const { url, key } = getSupabaseConfig();
      const res = await fetch(`${url}/rest/v1/contrato_cronograma?contrato_id=eq.${obraId}&order=data_inicio.asc`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      });
      return res.ok ? await res.json() : [];
    },
    enabled: !!obraId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
          <p className="text-teal-500 font-black tracking-widest uppercase text-xs animate-pulse">Carregando Portal...</p>
        </div>
      </div>
    );
  }

  if (isError || !obra) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-center p-6">
        <div>
          <AlertTriangle size={48} className="text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white uppercase">Acesso Negado</h1>
          <p className="text-slate-400 mt-2">Esta obra não existe ou o link expirou.</p>
        </div>
      </div>
    );
  }

  const progressoTotal = cronograma.length > 0 
    ? Math.round(cronograma.reduce((acc: number, item: any) => acc + (item.percentual_conclusao || 0), 0) / cronograma.length) 
    : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white font-sans selection:bg-teal-500/30">
      {/* Premium Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Building2 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-white">{obra.titulo}</h1>
              <p className="text-xs text-slate-400 font-medium">Cliente: {obra.cliente?.nome}</p>
            </div>
          </div>
          
          <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progresso da Obra</span>
              <span className="text-2xl font-black text-teal-400">{progressoTotal}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressoTotal}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-6 flex gap-6 border-b border-white/5">
          <button 
            onClick={() => setActiveTab('rdo')}
            className={`pb-4 text-xs font-black uppercase tracking-wider transition-colors relative ${activeTab === 'rdo' ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Diário de Obra
            {activeTab === 'rdo' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400" />}
          </button>
          <button 
            onClick={() => setActiveTab('gantt')}
            className={`pb-4 text-xs font-black uppercase tracking-wider transition-colors relative ${activeTab === 'gantt' ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Cronograma
            {activeTab === 'gantt' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400" />}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'rdo' ? (
            <motion.div 
              key="rdo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {diarios.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-3xl">
                  <Camera size={32} className="mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-400 text-sm">Nenhum registro de obra publicado ainda.</p>
                </div>
              ) : (
                diarios.map((diario: any) => (
                  <div key={diario.id} className="relative pl-8">
                    {/* Linha do tempo */}
                    <div className="absolute top-0 left-[11px] bottom-0 w-px bg-white/10" />
                    
                    {/* Bolinha da timeline */}
                    <div className="absolute top-1.5 left-0 w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/50 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-teal-400" />
                    </div>

                    <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-colors">
                      <div className="p-5 border-b border-white/5 flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest block mb-1">
                            {format(new Date(diario.data_registro), "EEEE, d 'de' MMMM", { locale: ptBR })}
                          </span>
                          <h3 className="text-lg font-bold text-white">{diario.titulo}</h3>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                          <HardHat size={12} />
                          <span className="text-[10px] font-bold">{diario.mao_de_obra_qtd} na obra</span>
                        </div>
                      </div>

                      <div className="p-5">
                        <p className="text-sm text-slate-300 leading-relaxed mb-6">{diario.relatorio}</p>
                        
                        {diario.fotos && diario.fotos.length > 0 && (
                          <div className="grid grid-cols-2 gap-3">
                            {diario.fotos.map((foto: string, idx: number) => (
                              <div key={idx} className="aspect-video rounded-xl overflow-hidden bg-black/50 border border-white/5">
                                <img src={foto} alt={`Foto da obra ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="gantt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-slate-900/30 border border-white/5 rounded-3xl p-6 mb-6">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Acompanhamento de Etapas</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Aqui você acompanha o avanço das fases da sua obra. As fases podem acontecer em paralelo ou dependerem umas das outras.
                </p>
              </div>

              {cronograma.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-3xl">
                  <Calendar size={32} className="mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-400 text-sm">Cronograma ainda não definido.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cronograma.map((etapa: any) => (
                    <div key={etapa.id} className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:bg-slate-800/80 transition-colors">
                      <div className="flex items-center gap-4">
                        {etapa.percentual_conclusao === 100 ? (
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={20} />
                          </div>
                        ) : etapa.percentual_conclusao > 0 ? (
                          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                            <Clock size={20} />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-slate-600 flex items-center justify-center shrink-0">
                            <Circle size={20} />
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-bold text-white mb-0.5">{etapa.titulo}</h4>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {etapa.data_inicio ? format(new Date(etapa.data_inicio), 'dd/MM/yyyy') : 'A definir'} - {etapa.data_fim ? format(new Date(etapa.data_fim), 'dd/MM/yyyy') : 'A definir'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xl font-black font-mono text-white">{etapa.percentual_conclusao}%</span>
                        <div className="w-24 h-1.5 bg-black/50 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${etapa.percentual_conclusao === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                            style={{ width: `${etapa.percentual_conclusao}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
