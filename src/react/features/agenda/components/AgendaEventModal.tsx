import { useState } from 'react';
import { LucideX, LucideCalendar, LucideClock, LucideAlignLeft } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialStore } from '../../../app/useFilialStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { toast } from 'sonner';

type AgendaEventModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
};

export function AgendaEventModal({ isOpen, onClose, selectedDate }: AgendaEventModalProps) {
  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const filialId = useFilialStore(s => s.filialId);
  const config = getSupabaseConfig();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState(
    selectedDate ? selectedDate.toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [dataFim, setDataFim] = useState(
    selectedDate 
      ? new Date(selectedDate.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16) 
      : new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [diaInteiro, setDiaInteiro] = useState(false);

  const createEvent = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id || !filialId) throw new Error('Não autenticado');
      
      const res = await fetch(`${config.url}/rest/v1/agenda_eventos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.key,
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          filial_id: filialId,
          criado_por: session.user.id,
          titulo,
          descricao,
          data_inicio: new Date(dataInicio).toISOString(),
          data_fim: new Date(dataFim).toISOString(),
          dia_inteiro: diaInteiro
        })
      });

      if (!res.ok) throw new Error('Erro ao salvar evento');
    },
    onSuccess: () => {
      toast.success('Evento criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['unified_calendar'] });
      onClose();
      setTitulo('');
      setDescricao('');
    },
    onError: (e: any) => {
      toast.error('Erro ao criar evento', { description: e.message });
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B1120] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <LucideCalendar className="h-5 w-5 text-indigo-400" />
            Novo Evento Interno
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
            <LucideX className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Título do Evento</label>
            <input 
              type="text" 
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/50 p-2.5 text-white outline-none focus:border-indigo-500"
              placeholder="Ex: Reunião de Alinhamento"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-1">
                <LucideClock className="h-4 w-4" /> Início
              </label>
              <input 
                type={diaInteiro ? "date" : "datetime-local"}
                value={diaInteiro ? dataInicio.split('T')[0] : dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/50 p-2.5 text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-1">
                <LucideClock className="h-4 w-4" /> Fim
              </label>
              <input 
                type={diaInteiro ? "date" : "datetime-local"}
                value={diaInteiro ? dataFim.split('T')[0] : dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/50 p-2.5 text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="diaInteiro"
              checked={diaInteiro}
              onChange={e => setDiaInteiro(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
            />
            <label htmlFor="diaInteiro" className="text-sm text-slate-300">Dia Inteiro</label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-1">
              <LucideAlignLeft className="h-4 w-4" /> Descrição
            </label>
            <textarea 
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              className="w-full min-h-[100px] rounded-lg border border-slate-800 bg-slate-900/50 p-2.5 text-white outline-none focus:border-indigo-500"
              placeholder="Detalhes adicionais..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/20 p-4">
          <button 
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button 
            onClick={() => createEvent.mutate()}
            disabled={!titulo || createEvent.isPending}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {createEvent.isPending ? 'Salvando...' : 'Salvar Evento'}
          </button>
        </div>
      </div>
    </div>
  );
}
