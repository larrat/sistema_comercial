import { PlusCircle } from 'lucide-react';
import { Button, LoadingState, ErrorState, EmptyState, FormError } from '../../../../shared/ui';
import { formatDateLong } from '../ClienteProfileHelpers';

export function ClienteAbaNotas({
  notaDraft,
  setNotaDraft,
  notaError,
  notasError,
  notaSaving,
  handleSubmitNota,
  notasLoading,
  notasOrdenadas
}: any) {
  return (
    <section className="flex flex-col gap-6 animate-in fade-in duration-200">
      <section className="bg-slate-900 border border-white/5 rounded-xl shadow-sm p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white tracking-tight">Notas comerciais</h3>
        </div>
        <div className="flex flex-col gap-3 mb-8">
          <textarea
            className="w-full bg-slate-950 border border-white/10 text-white text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 p-4 outline-none resize-y transition-all"
            rows={4}
            placeholder="Registrar observação comercial…"
            value={notaDraft}
            onChange={(event) => setNotaDraft(event.target.value)}
          />
          <FormError message={notaError || notasError} />
          <div className="flex justify-end mt-1">
            <Button 
              variant="primary" 
              loading={notaSaving} 
              onClick={() => void handleSubmitNota()}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Salvar nota
            </Button>
          </div>
        </div>
        {notasLoading ? (
          <LoadingState title="Carregando notas…" compact />
        ) : notasOrdenadas.length ? (
          <div className="flex flex-col gap-4">
            {notasOrdenadas.map((nota: any, index: number) => (
              <article key={`${nota.data}-${index}`} className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="mb-2 text-sm font-medium text-slate-400">{formatDateLong(nota.data)}</div>
                <p className="text-sm font-medium text-amber-200/80 leading-relaxed">{nota.texto}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhuma nota registrada." compact />
        )}
      </section>
    </section>
  );
}
