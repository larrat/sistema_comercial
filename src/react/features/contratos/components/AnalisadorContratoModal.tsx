import { useState } from 'react';
import { LucideX, LucideUpload, LucideBot, LucideCalendar, LucideCheck, LucideTrash } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as chrono from 'chrono-node';
import { format } from 'date-fns';
import { useAuthStore } from '../../../app/useAuthStore';
import { useFilialContext } from '../../../app/filial/FilialProvider';
import { agendaApi } from '../../agenda/services/agendaApi';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';

// Configura o worker do PDF.js via CDN compatível com Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  contratoId: string;
};

type ExtractedEvent = {
  id: string;
  title: string;
  date: Date;
  type: 'projeto' | 'financeiro' | 'agenda' | 'outro';
  contextSnippet: string;
  selected: boolean;
};

export function AnalisadorContratoModal({ isOpen, onClose, contratoId }: Props) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [events, setEvents] = useState<ExtractedEvent[]>([]);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  
  const filialId = useFilialContext().filialId;
  const session = useAuthStore((s) => s.session);
  const config = getSupabaseConfig();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      analyzeText(fullText);
    } catch (error) {
      console.error("Erro ao ler PDF:", error);
      toast.error('Erro ao ler o arquivo PDF. Verifique se não está corrompido.');
    } finally {
      setIsExtracting(false);
    }
  };

  const analyzeText = (text: string) => {
    // 1. Encontra todas as menções a datas (em português)
    const results = chrono.pt.parse(text);
    const extracted: ExtractedEvent[] = [];

    // 2. Lógica Heurística
    results.forEach((res, index) => {
      if (!res.start || !res.start.date()) return;
      
      const date = res.start.date();
      // Pega ~60 caracteres antes e depois da data para analisar o contexto
      const snippetStart = Math.max(0, res.index - 60);
      const snippetEnd = Math.min(text.length, res.index + res.text.length + 60);
      const snippet = text.substring(snippetStart, snippetEnd).toLowerCase();

      let type: ExtractedEvent['type'] = 'outro';
      let title = 'Evento Extraído';

      // Gatilhos de NLP heurístico
      if (snippet.match(/(pagamento|faturamento|parcela|sinal|boleto|valor|nota fiscal)/)) {
        type = 'financeiro';
        title = 'Data de Pagamento/Faturamento';
      } else if (snippet.match(/(entrega|finalização|prazo|milestone|conclusão|assinatura)/)) {
        type = 'projeto';
        title = 'Prazo de Projeto/Milestone';
      } else if (snippet.match(/(reunião|kickoff|visita|call|alinhamento)/)) {
        type = 'agenda';
        title = 'Reunião/Visita Agendada';
      }

      // Evitar extração de anos perdidos que a chrono pega como data (ex: "em 2026") se não for uma data específica
      if (res.text.length <= 4 && !isNaN(Number(res.text))) return; 

      extracted.push({
        id: `evt-${index}`,
        title,
        date,
        type,
        contextSnippet: `"...${text.substring(snippetStart, snippetEnd).replace(/\n/g, ' ')}..."`,
        selected: type !== 'outro', // Pré-seleciona os que tem contexto forte
      });
    });

    setEvents(extracted);
    setStep('review');
  };

  const toggleEventSelection = (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, selected: !e.selected } : e));
  };

  const handleTitleChange = (id: string, newTitle: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, title: newTitle } : e));
  };

  const saveEventsMutation = useMutation({
    mutationFn: async (selectedEvents: ExtractedEvent[]) => {
      if (!session?.user?.id || !filialId) throw new Error('Sessão inválida');
      
      const ctx = {
        url: config.url,
        key: config.key,
        token: session.access_token,
        filialId
      };

      for (const evt of selectedEvents) {
        await agendaApi.createEvento(ctx, {
          titulo: evt.title,
          data_inicio: evt.date.toISOString(),
          data_fim: new Date(evt.date.getTime() + 60 * 60 * 1000).toISOString(),
          dia_inteiro: true,
          descricao: `[Extraído por IA NLP do Contrato]\nContexto original: ${evt.contextSnippet}`,
          tipo: evt.type === 'agenda' ? 'reuniao' : evt.type === 'financeiro' ? 'lembrete' : 'tarefa',
          contrato_id: contratoId,
          criado_por: session.user.id
        });
      }
    },
    onSuccess: () => {
      toast.success('Eventos gerados na agenda com sucesso!');
      onClose();
    },
    onError: (err) => {
      toast.error('Erro ao salvar eventos: ' + err.message);
    }
  });

  const handleSave = () => {
    const selected = events.filter(e => e.selected);
    if (selected.length === 0) {
      toast.warning('Selecione pelo menos um evento para salvar.');
      return;
    }
    saveEventsMutation.mutate(selected);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <LucideBot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">Analisador de Prazos (NLP)</h2>
              <p className="text-xs text-slate-400">Extração inteligente de eventos via Heurística</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <LucideX className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {step === 'upload' ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative group cursor-pointer w-full max-w-md">
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={handleFileUpload}
                  disabled={isExtracting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-wait" 
                />
                <div className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/5 p-10 text-center transition-all group-hover:border-indigo-500/50 group-hover:bg-indigo-500/5 ${isExtracting ? 'opacity-50' : ''}`}>
                  {isExtracting ? (
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mb-4" />
                  ) : (
                    <LucideUpload className="mb-4 h-10 w-10 text-indigo-400" />
                  )}
                  <h3 className="mb-2 font-bold text-white">
                    {isExtracting ? 'Lendo Contrato...' : 'Arraste o PDF do Contrato'}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {isExtracting ? 'O motor NLP está caçando datas...' : 'Clique ou arraste um PDF para extrair datas, prazos e marcos de pagamento.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-300">
                  O motor heurístico encontrou <strong>{events.length}</strong> possíveis eventos neste contrato. 
                  Revise os títulos e marque quais você deseja exportar para a agenda.
                </p>
              </div>

              {events.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  Nenhuma data foi encontrada pelo motor neste contrato.
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((evt) => (
                    <div key={evt.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${evt.selected ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/5 bg-slate-900'}`}>
                      <button 
                        onClick={() => toggleEventSelection(evt.id)}
                        className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${evt.selected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-white/20 bg-white/5'}`}
                      >
                        {evt.selected && <LucideCheck className="h-4 w-4" />}
                      </button>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-4">
                          <div className="w-1/3">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Data Base (Encontrada)</label>
                            <div className="flex items-center gap-2 text-slate-200 font-medium">
                              <LucideCalendar className="h-4 w-4 text-indigo-400" />
                              {format(evt.date, 'dd/MM/yyyy')}
                            </div>
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Título do Evento</label>
                            <input 
                              type="text" 
                              value={evt.title}
                              onChange={(e) => handleTitleChange(evt.id, e.target.value)}
                              className="w-full rounded border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="bg-black/30 rounded p-2 text-xs italic text-slate-400 border border-white/5">
                          {evt.contextSnippet}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {step === 'review' && (
          <div className="border-t border-white/5 bg-slate-900/50 p-6 flex justify-between shrink-0">
            <button 
              onClick={() => { setStep('upload'); setEvents([]); }}
              className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
            >
              Analisar outro arquivo
            </button>
            <button 
              onClick={handleSave}
              disabled={saveEventsMutation.isPending || events.filter(e=>e.selected).length === 0}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveEventsMutation.isPending ? 'Salvando...' : `Gerar Eventos (${events.filter(e=>e.selected).length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
