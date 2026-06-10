import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Typography, LoadingState, ErrorState, Button, Card } from '../../../shared/ui';
import { Briefcase, Plus, Folder, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { listProjetos } from '../services/projetosApi';
import { format } from 'date-fns';

export function ProjetosListPage() {
  const navigate = useNavigate();
  const { resolve } = useApiContext();
  const context = resolve();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['projetos'],
    queryFn: () => listProjetos(context)
  });

  if (isLoading) return <LoadingState title="Carregando projetos…" />;
  if (isError) return <ErrorState title="Erro ao carregar projetos" description={error instanceof Error ? error.message : undefined} />;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase size={20} className="text-emerald-500" />
            <Typography variant="label" color="muted" className="uppercase tracking-widest font-black">Centro de Operações</Typography>
          </div>
          <Typography variant="h2" weight="black" className="uppercase tracking-tight">Projetos & Obras</Typography>
        </div>
        <Button onClick={() => navigate('/app/projetos/novo')} variant="primary">
          <Plus size={18} className="mr-2" /> Novo Projeto
        </Button>
      </div>

      {(!data || data.length === 0) ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/40 border border-white/5 rounded-3xl p-12 text-center shadow-xl">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
            <Folder size={40} className="text-emerald-500" />
          </div>
          <Typography variant="h3" className="mb-2 text-white font-bold">Nenhum projeto encontrado</Typography>
          <Typography variant="body" color="muted" className="mb-8 max-w-md mx-auto">
            O Hub Central conecta Levantamentos CAD, Orçamentos e Pedidos. Clique abaixo para começar seu primeiro ecossistema de projeto.
          </Typography>
          <Button onClick={() => navigate('/app/projetos/novo')} variant="secondary" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
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
              className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-6 shadow-xl hover:bg-slate-900/60 transition-colors group cursor-pointer relative overflow-hidden"
              onClick={() => navigate(`/app/projetos/${proj.id}`)}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Briefcase size={80} />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Folder size={24} className="text-emerald-400" />
                </div>
                {proj.status === 'em_andamento' ? (
                  <span className="bg-amber-500/10 text-amber-500 text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-md border border-amber-500/20">Em Andamento</span>
                ) : proj.status === 'concluido' ? (
                  <span className="bg-teal-500/10 text-teal-500 text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-md border border-teal-500/20">Concluído</span>
                ) : (
                  <span className="bg-rose-500/10 text-rose-500 text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-md border border-rose-500/20">Cancelado</span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors relative z-10">{proj.nome}</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium relative z-10 truncate">
                {proj.endereco?.logradouro ? `${proj.endereco.logradouro}, ${proj.endereco.numero || 'S/N'}` : 'Endereço não informado'}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-10">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Calendar size={14} />
                  {proj.criado_em ? format(new Date(proj.criado_em), "dd MMM yy") : ''}
                </div>
                <span className="text-xs text-emerald-500 font-bold hover:underline">Abrir Hub &rarr;</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
