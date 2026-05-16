import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useApiContext } from '../../../shared/hooks/useApiContext';
import { useAuthStore } from '../../../app/useAuthStore';
import { saveProduto } from '../services/produtosApi';
import { ProdutoForm } from '../components/ProdutoForm';
import { Typography, LoadingState, ErrorState } from '../../../shared/ui';
import { PackagePlus, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Produto } from '../../../../types/domain';
import { usePaisQuery } from '../hooks/useProdutosQuery';
import { formValuesToProduto } from '../hooks/useProdutoCalculations';
import type { ProdutoFormValues } from '../types';

export function ProdutoCreateRoutePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { resolve } = useApiContext();
  const context = resolve();
  const session = useAuthStore(s => s.session);
  const filialId = session?.user?.user_metadata?.filial_id ?? '';

  const { data: parentProdutos = [], isLoading: loadingPais, isError: errorPais } = usePaisQuery();

  const saveMutation = useMutation({
    mutationFn: (data: Produto | Produto[]) => saveProduto(context, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto(s) criado(s) com sucesso!');
      navigate('/app/produtos');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar produto');
    }
  });

  const handleSalvar = async (values: ProdutoFormValues, grade?: string[], cores?: string[]) => {
    try {
      const parent = formValuesToProduto(values, filialId, null);
      
      // Lista de produtos a serem salvos (Pai + Filhos)
      const payload: Produto[] = [parent];
      
      const hasGrade = grade && grade.length > 0;
      const hasCores = cores && cores.length > 0;

      if (hasGrade || hasCores) {
        const activeCores = hasCores ? cores : [null];
        const activeSizes = hasGrade ? grade : [null];

        activeCores.forEach(color => {
          activeSizes.forEach(size => {
            // Se ambos forem null, é o próprio pai (já está no payload)
            if (!color && !size) return;

            const nameParts = [parent.nome.trim()];
            if (color) nameParts.push(color);
            if (size) nameParts.push(size);
            
            const skuParts = [parent.sku?.trim() || 'PROD'];
            if (color) skuParts.push(color.toUpperCase().slice(0, 3));
            if (size) skuParts.push(size);

            payload.push({
              ...parent,
              id: crypto.randomUUID(),
              produto_pai_id: parent.id,
              nome: nameParts.join(' - '),
              sku: skuParts.join('-'),
              tamanho: size,
              genero: parent.genero
            });
          });
        });
      }

      saveMutation.mutate(payload);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar dados do produto');
    }
  };

  if (loadingPais) return <LoadingState message="Carregando base de produtos..." />;
  if (errorPais) return <ErrorState message="Erro ao carregar dependências do catálogo" />;

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
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
          <ProdutoForm
            produto={null}
            pais={parentProdutos}
            saving={saveMutation.isPending}
            error={saveMutation.error instanceof Error ? saveMutation.error.message : null}
            onSalvar={handleSalvar}
            onCancelar={() => navigate('/app/produtos')}
          />
        </div>
      </div>
    </motion.div>
  );
}
