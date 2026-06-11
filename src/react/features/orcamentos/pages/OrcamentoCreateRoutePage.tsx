import React, { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { OrcamentoForm } from '../components/OrcamentoForm';
import { orcamentosApi, type OrcamentoObra, type OrcamentoItem } from '../services/orcamentosApi';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';

export function OrcamentoCreateRoutePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projetoId = searchParams.get('projetoId') || undefined;
  
  const { session } = useAuthStore();
  const { filialId: currentFilialId } = useFilialStore();

  const mutation = useMutation({
    mutationFn: async (data: { cabecalho: Partial<OrcamentoObra>, itens: OrcamentoItem[] }) => {
      if (!session?.access_token || !currentFilialId) throw new Error('Não autenticado');
      
      // Merge projeto_id if present
      const cabecalhoFinal = { ...data.cabecalho };
      if (projetoId && !cabecalhoFinal.projeto_id) {
        cabecalhoFinal.projeto_id = projetoId;
      }
      
      return orcamentosApi.saveOrcamento(session.access_token, currentFilialId, cabecalhoFinal, data.itens);
    },
    onSuccess: (savedData) => {
      toast.success('Orçamento salvo com sucesso!');
      // Retorna para a página do projeto ou para a listagem
      if (projetoId) {
        navigate(`/app/projetos/${projetoId}`);
      } else {
        navigate('/app/orcamentos');
      }
    },
    onError: (err: any) => {
      toast.error('Erro ao salvar orçamento', { description: err.message });
    }
  });

  const handleSave = useCallback((cabecalho: Partial<OrcamentoObra>, itens: OrcamentoItem[]) => {
    mutation.mutate({ cabecalho, itens });
  }, [mutation]);

  const handleClose = useCallback(() => {
    if (projetoId) {
      navigate(`/app/projetos/${projetoId}`);
    } else {
      navigate('/app/orcamentos');
    }
  }, [navigate, projetoId]);

  if (!currentFilialId) return null;

  return (
    <OrcamentoForm
      filialId={currentFilialId}
      onSave={handleSave}
      onClose={handleClose}
      initialData={{
        // Add fake initial data if needed, or rely on undefined
        projeto_id: projetoId
      } as any}
    />
  );
}
