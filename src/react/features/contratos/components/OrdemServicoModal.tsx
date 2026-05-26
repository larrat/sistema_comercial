import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useContratosMutations } from '../hooks/useContratosMutations';
import { useFilialStore } from '../../../app/useFilialStore';
import { useAuthStore } from '../../../app/useAuthStore';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { contratosApi } from '../services/contratosApi';
import { LucideX, LucideSave, User, DollarSign } from 'lucide-react';

type FormData = {
  titulo: string;
  descricao: string;
  terceirizado_id: string;
  valor_parceiro: number;
  is_garantia: boolean;
};

export function OrdemServicoModal({ contratoId, onClose }: { contratoId: string, onClose: () => void }) {
  const { createOs, isCreatingOs } = useContratosMutations();
  const filialId = useFilialStore((s) => s.filialId);
  const session = useAuthStore((s) => s.session);
  const { register, handleSubmit } = useForm<FormData>();

  // Fetch users belonging to this filial to act as potential subcontractors
  const { data: users = [] } = useQuery({
    queryKey: ['filial-users', filialId],
    queryFn: () => {
      const config = getSupabaseConfig();
      if (!filialId || !session?.access_token || !config.ready) return [];
      return contratosApi.getFilialUsers({
        url: config.url,
        key: config.key,
        token: session.access_token,
        filialId
      });
    },
    enabled: !!filialId && !!session?.access_token
  });

  const onSubmit = async (data: FormData) => {
    await createOs({
      contrato_id: contratoId,
      titulo: data.titulo,
      descricao: data.descricao,
      terceirizado_id: data.terceirizado_id || null,
      valor_parceiro: data.valor_parceiro ? Number(data.valor_parceiro) : 0,
      is_garantia: !!data.is_garantia
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-white/5 p-5 bg-white/[0.02]">
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider">Nova Ordem de Serviço</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Vincular etapa de execução da reforma</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <LucideX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Título da O.S.</label>
              <input
                {...register('titulo', { required: true })}
                className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white focus:border-teal-500 focus:outline-none transition-all placeholder-slate-600"
                placeholder="Ex: Demolição da Parede do Banheiro"
              />
            </div>
            
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Descrição / Instruções</label>
              <textarea
                {...register('descricao')}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white focus:border-teal-500 focus:outline-none transition-all placeholder-slate-600"
                placeholder="Detalhes sobre a execução física e especificações técnicas..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <User size={12} className="text-slate-500" /> Parceiro Terceirizado
                </label>
                <select
                  {...register('terceirizado_id')}
                  className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white focus:border-teal-500 focus:outline-none transition-all appearance-none"
                >
                  <option value="">Nenhum (Equipe Interna)</option>
                  {users.map(u => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.user_nome || u.user_email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <DollarSign size={12} className="text-slate-500" /> Repasse / Medição (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('valor_parceiro')}
                  className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white focus:border-teal-500 focus:outline-none transition-all placeholder-slate-600"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <label className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 cursor-pointer hover:bg-rose-500/10 transition-colors mt-1">
              <input
                type="checkbox"
                {...register('is_garantia')}
                className="rounded border-rose-500/30 bg-black/40 text-rose-500 focus:ring-0 focus:ring-offset-0 h-4 w-4"
              />
              <div className="flex-1">
                <div className="text-[10px] font-black text-rose-400 uppercase tracking-wider">O.S. de Garantia / Assistência</div>
                <div className="text-[9px] text-slate-400 mt-0.5 leading-normal">
                  Esta ordem de serviço é corretiva e está sob regime de garantia pós-obra do contrato.
                </div>
              </div>
            </label>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-white/5 pt-5">
            <button 
              type="button" 
              onClick={onClose} 
              className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isCreatingOs} 
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              <LucideSave className="h-4 w-4" />
              Criar O.S.
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
