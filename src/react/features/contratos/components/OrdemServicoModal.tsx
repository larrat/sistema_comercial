import { useForm } from 'react-hook-form';
import { useContratosMutations } from '../hooks/useContratosMutations';
import { LucideX, LucideSave } from 'lucide-react';

type FormData = {
  titulo: string;
  descricao: string;
};

export function OrdemServicoModal({ contratoId, onClose }: { contratoId: string, onClose: () => void }) {
  const { createOs, isCreatingOs } = useContratosMutations();
  const { register, handleSubmit } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    await createOs({
      contrato_id: contratoId,
      titulo: data.titulo,
      descricao: data.descricao,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 p-5">
          <h2 className="text-lg font-bold text-white">Nova Ordem de Serviço</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5">
            <LucideX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid gap-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-400">Título da O.S.</label>
              <input
                {...register('titulo', { required: true })}
                className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white focus:border-teal-500 focus:outline-none"
                placeholder="Ex: Demolição da Parede"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-400">Descrição / Instruções</label>
              <textarea
                {...register('descricao')}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white focus:border-teal-500 focus:outline-none"
                placeholder="Detalhes sobre a execução..."
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-white/5 pt-5">
            <button type="button" onClick={onClose} className="rounded-xl px-5 py-2 text-sm font-semibold text-slate-300">
              Cancelar
            </button>
            <button type="submit" disabled={isCreatingOs} className="flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-2 text-sm font-bold text-white shadow-lg disabled:opacity-50">
              <LucideSave className="h-4 w-4" />
              Salvar O.S.
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
