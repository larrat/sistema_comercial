import { Cloud, CloudRain, Sun, UserCheck, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { Button, Card, EmptyState } from '../../../../shared/ui';

type Props = {
  diarios: any[];
  newDiarioTitle: string;
  setNewDiarioTitle: (val: string) => void;
  newDiarioClima: 'ensolarado' | 'chuvoso' | 'nublado';
  setNewDiarioClima: (val: 'ensolarado' | 'chuvoso' | 'nublado') => void;
  newDiarioMaoDeObra: number;
  setNewDiarioMaoDeObra: (val: number) => void;
  newDiarioRelatorio: string;
  setNewDiarioRelatorio: (val: string) => void;
  uploadedPhotos: string[];
  handleAddDiario: (e: React.FormEvent) => void;
  uploadRdoFotoMutation: any;
  createDiarioMutation: any;
};

export function ContratoAbaDiario({
  diarios,
  newDiarioTitle,
  setNewDiarioTitle,
  newDiarioClima,
  setNewDiarioClima,
  newDiarioMaoDeObra,
  setNewDiarioMaoDeObra,
  newDiarioRelatorio,
  setNewDiarioRelatorio,
  uploadedPhotos,
  handleAddDiario,
  uploadRdoFotoMutation,
  createDiarioMutation
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-5">
          {diarios.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-10 text-center shadow-xl">
              <EmptyState title="Nenhum Diário de Obra (RDO) lançado para este projeto." compact />
            </div>
          ) : (
            diarios.map(rdo => (
              <div key={rdo.id} className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-lg space-y-4">
                <div className="flex items-start justify-between border-b border-white/5 pb-3">
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase">Diário de Obra — {format(new Date(rdo.criado_em), 'dd/MM/yyyy HH:mm')}</span>
                    <h4 className="font-bold text-white text-sm mt-0.5">{rdo.titulo}</h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold uppercase">
                      <UserCheck size={12} /> {rdo.mao_de_obra_qtd || 0} operários
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold uppercase">
                      {rdo.clima === 'ensolarado' && <Sun size={12} />}
                      {rdo.clima === 'chuvoso' && <CloudRain size={12} />}
                      {rdo.clima === 'nublado' && <Cloud size={12} />}
                      Clima: {rdo.clima}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-medium whitespace-pre-line">{rdo.relatorio}</p>

                {rdo.fotos && rdo.fotos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {rdo.fotos.map((foto: string, fIdx: number) => (
                      <div key={fIdx} className="aspect-video rounded-xl bg-slate-950 overflow-hidden border border-white/5 shadow-md">
                        <img src={foto} alt={`Obra-${fIdx}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-6">
        <Card className="p-5 bg-slate-900/40 border-white/10 shadow-lg">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Adicionar Entrada (RDO)</h3>
          <form onSubmit={handleAddDiario} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resumo do Dia</label>
              <input 
                type="text" 
                placeholder="Ex: Conclusão do Reboco do Banheiro"
                value={newDiarioTitle}
                onChange={(e) => setNewDiarioTitle(e.target.value)}
                className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Clima Observado</label>
              <select
                value={newDiarioClima}
                onChange={(e) => setNewDiarioClima(e.target.value as any)}
                className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
              >
                <option value="ensolarado">☀️ Ensolarado</option>
                <option value="nublado">☁️ Nublado</option>
                <option value="chuvoso">🌧️ Chuvoso</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mão de Obra Presente</label>
              <input 
                type="number" 
                min="1"
                value={newDiarioMaoDeObra}
                onChange={(e) => setNewDiarioMaoDeObra(Number(e.target.value))}
                className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Relatório Técnico / Ocorrências</label>
              <textarea 
                rows={4}
                placeholder="Descreva o que foi realizado, entregas recebidas e ocorrências..."
                value={newDiarioRelatorio}
                onChange={(e) => setNewDiarioRelatorio(e.target.value)}
                className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Registros Fotográficos</label>
              <div className="flex flex-wrap gap-2">
                {uploadedPhotos.map((p, pIdx) => (
                  <div key={pIdx} className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-slate-950">
                    <img src={p} alt="upload" className="w-full h-full object-cover" />
                  </div>
                ))}
                <div className="flex gap-2 relative">
                  <button
                    type="button"
                    onClick={() => document.getElementById('rdo-real-upload')?.click()}
                    className="w-12 h-12 rounded-lg border-2 border-dashed border-white/10 hover:border-teal-500/30 text-slate-600 hover:text-teal-400 flex flex-col items-center justify-center transition-all bg-white/[0.01]"
                    title="Anexar Foto (Storage)"
                    disabled={uploadRdoFotoMutation.isPending}
                  >
                    <Camera size={14} />
                  </button>
                  {uploadRdoFotoMutation.isPending && (
                    <div className="absolute top-0 left-0 w-12 h-12 bg-black/50 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                    </div>
                  )}
                  <input 
                    id="rdo-real-upload"
                    type="file" 
                    accept="image/*" 
                    multiple
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files) {
                        Array.from(e.target.files).forEach(file => {
                          uploadRdoFotoMutation.mutate(file);
                        });
                      }
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full"
              disabled={createDiarioMutation.isPending || uploadRdoFotoMutation.isPending}
            >
              Registrar Diário
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
