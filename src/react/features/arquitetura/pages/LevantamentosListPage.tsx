import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Typography, LoadingState, ErrorState, Button } from '../../../shared/ui';
import { PencilRuler, Plus, LayoutTemplate, Layers, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { listLevantamentos } from '../services/levantamentosApi';
import { downloadDXF } from '../lib/dxfExport';
import { format } from 'date-fns';

export function LevantamentosListPage() {
  const navigate = useNavigate();
  const { resolve } = useApiContext();
  const context = resolve();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['levantamentos'],
    queryFn: () => listLevantamentos(context)
  });

  if (isLoading) return <LoadingState title="Carregando levantamentos…" />;
  if (isError) return <ErrorState title="Erro ao carregar levantamentos" description={error instanceof Error ? error.message : undefined} />;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers size={20} className="text-indigo-500" />
            <Typography variant="label" color="muted" className="uppercase tracking-widest font-black">Módulo de Arquitetura</Typography>
          </div>
          <Typography variant="h2" weight="black" className="uppercase tracking-tight">Levantamentos</Typography>
        </div>
        <Button onClick={() => navigate('/app/arquitetura/levantamento/novo')} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]">
          <Plus size={18} className="mr-2" /> Novo Projeto
        </Button>
      </div>

      {(!data || data.length === 0) ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/40 border border-white/5 rounded-3xl p-12 text-center shadow-xl">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <PencilRuler size={40} className="text-indigo-500" />
          </div>
          <Typography variant="h3" className="mb-2">Nenhum projeto encontrado</Typography>
          <Typography variant="body" color="muted" className="mb-8 max-w-md mx-auto">
            Você ainda não possui medições ou levantamentos salvos. Clique abaixo para iniciar um novo projeto de obra.
          </Typography>
          <Button onClick={() => navigate('/app/arquitetura/levantamento/novo')} variant="secondary" className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
            Iniciar Primeiro Projeto
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((proj) => (
            <motion.div 
              key={proj.id} 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-6 shadow-xl hover:bg-slate-900/60 transition-colors group cursor-pointer"
              onClick={() => navigate(`/app/arquitetura/levantamento/${proj.id}`)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                  <LayoutTemplate size={24} className="text-indigo-400" />
                </div>
                {proj.status === 'rascunho' ? (
                  <span className="bg-amber-500/10 text-amber-500 text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-md border border-amber-500/20">Rascunho</span>
                ) : (
                  <span className="bg-emerald-500/10 text-emerald-500 text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-md border border-emerald-500/20">Finalizado</span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{proj.nome_projeto}</h3>
                {Array.isArray(proj.dados_cad) ? proj.dados_cad.length : 0} ambiente(s) mapeado(s)
              
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-xs text-slate-600 font-mono">
                  {proj.atualizado_em ? format(new Date(proj.atualizado_em), "dd MMM yy 'às' HH:mm") : ''}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (Array.isArray(proj.dados_cad)) {
                      downloadDXF(proj.dados_cad as any, proj.nome_projeto);
                    }
                  }}
                  className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors border border-indigo-500/20"
                  title="Baixar DXF"
                >
                  <Download size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
