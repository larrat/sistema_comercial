import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Save, Upload, FileText } from 'lucide-react';
import { Button, Card, LoadingState } from '../../../shared/ui';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';

export function LevantamentoRoutePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const { filialId: currentFilialId } = useFilialStore();

  const [linkCad, setLinkCad] = useState('');
  const [escopo, setEscopo] = useState('');

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session?.access_token || !currentFilialId || !id) throw new Error('Não autenticado');
      const { url, key } = getSupabaseConfig();
      
      const payload = {
        projeto_id: id,
        filial_id: currentFilialId,
        link_cad: linkCad,
        escopo_checklist: escopo,
        status: 'em_andamento'
      };

      const res = await fetch(`${url}/rest/v1/levantamentos_arquitetura`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Erro ao salvar levantamento');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Levantamento criado com sucesso!');
      navigate(`/app/projetos/${id}`);
    },
    onError: (err: any) => {
      toast.error('Erro ao salvar', { description: err.message });
    }
  });

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={() => navigate(`/app/projetos/${id}`)}>
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-white">Nova Medição / Levantamento</h1>
          <p className="text-slate-400 mt-1">Anexe os arquivos de medição do local para orçamentação</p>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">Link do Arquivo CAD / Nuvem de Pontos</label>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Upload className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="url" 
                value={linkCad}
                onChange={e => setLinkCad(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 pl-9 text-white focus:outline-none focus-visible:border-teal-500 focus-visible:ring-1 focus-visible:ring-teal-500 transition-all"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">Cole o link do Drive/Dropbox com o .DXF ou arquivo nativo.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">Escopo do Levantamento / Checklist</label>
          <textarea 
            value={escopo}
            onChange={e => setEscopo(e.target.value)}
            rows={5}
            placeholder="- Medir forro&#10;- Verificar quadro de luz&#10;- Ponto de água da ilha..."
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus-visible:border-teal-500 focus-visible:ring-1 focus-visible:ring-teal-500 transition-all resize-none"
          />
        </div>

        <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => navigate(`/app/projetos/${id}`)}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            leftIcon={<Save size={16} />} 
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
          >
            Salvar Levantamento
          </Button>
        </div>
      </Card>
    </div>
  );
}
