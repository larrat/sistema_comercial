import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCrmMutations } from '../hooks/useCrmMutations';
import { LucideX, LucideSave } from 'lucide-react';
import type { CrmOportunidadeDraft } from '../types';

const formSchema = z.object({
  nome_lead: z.string().min(3, 'Nome muito curto'),
  telefone: z.string().min(8, 'Telefone inválido'),
  endereco_obra: z.string().min(5, 'Endereço obrigatório para vistoria'),
  valor_estimado: z.coerce.number().min(0),
  tags: z.string(), // We will split this by comma
});

type FormData = z.infer<typeof formSchema>;

export function OportunidadeModal({ onClose }: { onClose: () => void }) {
  const { createOportunidade, isCreating } = useCrmMutations();
  
  const { register, handleSubmit, formState: { errors } } = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: { valor_estimado: 0 }
  });

  const onSubmit = async (data: any) => {
    const draft: CrmOportunidadeDraft = {
      ...data,
      tags: String(data.tags || '').split(',').map(t => t.trim()).filter(Boolean),
      valor_estimado: Number(data.valor_estimado || 0)
    };
    
    await createOportunidade(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 p-5">
          <h2 className="text-lg font-bold text-white">Nova Oportunidade de Reforma</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white">
            <LucideX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid gap-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-400">
                Nome do Lead / Cliente *
              </label>
              <input
                {...register('nome_lead')}
                className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Ex: João Silva ou Condomínio XYZ"
              />
              {errors.nome_lead && <span className="mt-1 text-xs text-rose-500">{errors.nome_lead.message as string}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-400">
                  Telefone / WhatsApp *
                </label>
                <input
                  {...register('telefone')}
                  className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="(00) 00000-0000"
                />
                {errors.telefone && <span className="mt-1 text-xs text-rose-500">{errors.telefone.message as string}</span>}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-400">
                  Valor Estimado (R$)
                </label>
                <input
                  type="number"
                  {...register('valor_estimado')}
                  className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-400">
                Endereço da Obra *
              </label>
              <textarea
                {...register('endereco_obra')}
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Rua, Número, Bairro, Apartamento..."
              />
              {errors.endereco_obra && <span className="mt-1 text-xs text-rose-500">{errors.endereco_obra.message as string}</span>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-400">
                Tags de Serviços (separadas por vírgula)
              </label>
              <input
                {...register('tags')}
                className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Pintura, Alvenaria, Gesso"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-white/5 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <LucideSave className="h-4 w-4" />
              {isCreating ? 'Salvando...' : 'Salvar Oportunidade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
