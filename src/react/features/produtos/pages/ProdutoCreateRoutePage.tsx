import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useApiContext } from '../../../shared/hooks/useApiContext';
import { useAuthStore } from '../../../app/useAuthStore';
import { saveProduto } from '../services/produtosApi';
import { ProdutoForm } from '../components/ProdutoForm';
import { Typography } from '../../../shared/ui';
import { PackagePlus, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Produto } from '../../../../types/domain';

export function ProdutoCreateRoutePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { resolve } = useApiContext();
  const context = resolve();
  const filialId = useAuthStore(s => s.session?.user?.user_metadata?.filial_id);

  const saveMutation = useMutation({
    mutationFn: (data: Produto | Produto[]) => saveProduto(context, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      navigate('/app/produtos');
    }
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto p-4 sm:p-8"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/app/produtos')}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-slate-400 transition-all hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PackagePlus size={16} className="text-cyan-500" />
              <Typography variant="label" color="muted" className="!text-[10px] uppercase tracking-widest font-black">Catálogo Nexus</Typography>
            </div>
            <Typography variant="h2" weight="black" className="uppercase tracking-tight">Novo Produto</Typography>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
        <div className="p-8 flex-1 overflow-y-auto">
          <ProdutoForm
            produto={null}
            pais={[]} // O ideal seria buscar os pais aqui também se necessário
            saving={saveMutation.isPending}
            error={saveMutation.error instanceof Error ? saveMutation.error.message : null}
            onSalvar={(values, grade, cores) => {
              // Lógica de mapeamento simplificada aqui ou reutilizar a do PilotPage
              const payload: any = {
                 ...values,
                 id: crypto.randomUUID(),
                 filial_id: filialId
              };
              // Se tiver grade/cores, precisa da lógica de expansão
              saveMutation.mutate(payload);
            }}
            onCancelar={() => navigate('/app/produtos')}
          />
        </div>
      </div>
    </motion.div>
  );
}
