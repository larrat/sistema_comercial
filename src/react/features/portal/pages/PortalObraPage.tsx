import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import {
  Camera,
  Calendar,
  CheckCircle2,
  Circle,
  HardHat,
  Building2,
  Clock,
  AlertTriangle,
  MessageCircle,
  DollarSign,
  FileText,
  Layers,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PortalPhotoLightbox } from '../components/PortalPhotoLightbox';
import { PortalFinanceiroTab } from '../components/PortalFinanceiroTab';
import { PortalDocumentosTab } from '../components/PortalDocumentosTab';

type PortalTab = 'rdo' | 'gantt' | 'financeiro' | 'documentos';

export function PortalObraPage() {
  const { obraId } = useParams();
  const [activeTab, setActiveTab] = useState<PortalTab>('rdo');

  // Lightbox State
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    photos: string[];
    index: number;
    title?: string;
    dateStr?: string;
  }>({
    isOpen: false,
    photos: [],
    index: 0
  });

  // Fetch Public Obra Data
  const { data: obra, isLoading, isError } = useQuery({
    queryKey: ['portal-obra', obraId],
    queryFn: async () => {
      const { url, key } = getSupabaseConfig();
      const res = await fetch(
        `${url}/rest/v1/contratos?id=eq.${obraId}&select=*,cliente:clientes(nome,tel,whatsapp)`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` }
        }
      );
      if (!res.ok) throw new Error('Obra não encontrada');
      const data = await res.json();
      return data[0];
    },
    enabled: !!obraId
  });

  // Fetch Daily Logs (RDO)
  const { data: diarios = [] } = useQuery({
    queryKey: ['portal-diarios', obraId],
    queryFn: async () => {
      const { url, key } = getSupabaseConfig();
      const res = await fetch(
        `${url}/rest/v1/diario_obra?contrato_id=eq.${obraId}&order=data_registro.desc`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` }
        }
      );
      return res.ok ? await res.json() : [];
    },
    enabled: !!obraId
  });

  // Fetch Schedule (Cronograma)
  const { data: cronograma = [] } = useQuery({
    queryKey: ['portal-cronograma', obraId],
    queryFn: async () => {
      const { url, key } = getSupabaseConfig();
      const res = await fetch(
        `${url}/rest/v1/contrato_cronograma?contrato_id=eq.${obraId}&order=data_inicio.asc`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` }
        }
      );
      return res.ok ? await res.json() : [];
    },
    enabled: !!obraId
  });

  // Fetch Documents & Blueprints
  const { data: arquivos = [] } = useQuery({
    queryKey: ['portal-arquivos', obraId],
    queryFn: async () => {
      const { url, key } = getSupabaseConfig();
      const res = await fetch(
        `${url}/rest/v1/contrato_arquivos?contrato_id=eq.${obraId}&order=criado_em.desc`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` }
        }
      );
      return res.ok ? await res.json() : [];
    },
    enabled: !!obraId
  });

  // Fetch Accounts Receivable (Medições Financeiras)
  const { data: contasReceber = [] } = useQuery({
    queryKey: ['portal-contas-receber', obraId],
    queryFn: async () => {
      const { url, key } = getSupabaseConfig();
      const res = await fetch(
        `${url}/rest/v1/contas_receber?pedido_id=eq.${obraId}&order=vencimento.asc`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` }
        }
      );
      return res.ok ? await res.json() : [];
    },
    enabled: !!obraId
  });

  // Calculations
  const progressoTotal = useMemo(() => {
    if (!cronograma.length) return 0;
    const soma = cronograma.reduce(
      (acc: number, item: any) => acc + (item.percentual_conclusao || 0),
      0
    );
    return Math.min(100, Math.round(soma / cronograma.length));
  }, [cronograma]);

  // Active Current Stage
  const etapaAtual = useMemo(() => {
    if (!cronograma.length) return null;
    return (
      cronograma.find(
        (e: any) => e.percentual_conclusao > 0 && e.percentual_conclusao < 100
      ) ||
      cronograma.find((e: any) => e.percentual_conclusao === 0) ||
      cronograma[cronograma.length - 1]
    );
  }, [cronograma]);

  const diasRestantes = useMemo(() => {
    if (!obra?.previsao_fim) return null;
    const diff = differenceInDays(new Date(obra.previsao_fim), new Date());
    return diff > 0 ? diff : 0;
  }, [obra?.previsao_fim]);

  function handleOpenPhoto(photos: string[], index: number, title?: string, dateStr?: string) {
    setLightboxState({
      isOpen: true,
      photos,
      index,
      title,
      dateStr
    });
  }

  function handleWhatsAppClick() {
    const phone = '5591988888888'; // Número de atendimento por padrão ou configurável
    const msg = encodeURIComponent(
      `Olá! Estou acompanhando a minha obra "${obra?.titulo || 'Projeto'}" e gostaria de tirar uma dúvida sobre a etapa atual.`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
          <p className="animate-pulse text-sm font-medium text-slate-400">
            Carregando Portal da Obra...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !obra) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-center p-6">
        <div>
          <AlertTriangle size={48} className="text-rose-500 mx-auto mb-4 animate-bounce" />
          <h1 className="text-2xl font-black text-white uppercase">Acesso Negado</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Esta obra não existe ou o link de acompanhamento expirou.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white font-sans selection:bg-teal-500/30 relative pb-24">
      {/* Lightbox Component */}
      <PortalPhotoLightbox
        isOpen={lightboxState.isOpen}
        photos={lightboxState.photos}
        currentIndex={lightboxState.index}
        title={lightboxState.title}
        dateStr={lightboxState.dateStr}
        onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
        onNavigate={(newIndex) => setLightboxState((prev) => ({ ...prev, index: newIndex }))}
      />

      {/* Premium Header */}
      <header className="bg-slate-900/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 pt-6 pb-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Building2 size={24} className="text-white" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block mb-0.5">
                  Portal do Cliente · Acompanhamento de Obra
                </span>
                <h1 className="text-xl font-black uppercase tracking-tight text-white leading-tight">
                  {obra.titulo}
                </h1>
                <p className="text-xs text-slate-400 font-medium">
                  Cliente: <span className="text-slate-200">{obra.cliente?.nome || '—'}</span>
                </p>
              </div>
            </div>

            {diasRestantes !== null && (
              <div className="hidden sm:flex flex-col items-end bg-white/5 border border-white/10 px-3.5 py-2 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Previsão de Término
                </span>
                <span className="text-sm font-black text-teal-400 font-mono">
                  {diasRestantes > 0 ? `${diasRestantes} dias restantes` : 'Fase Final'}
                </span>
              </div>
            )}
          </div>

          {/* Progress Overview Card */}
          <div className="bg-black/50 rounded-2xl p-4 border border-white/5 shadow-inner">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Avanço Físico Geral
              </span>
              <span className="text-2xl font-black text-teal-400 font-mono">
                {progressoTotal}%
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressoTotal}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-emerald-300 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-3xl mx-auto px-6 flex gap-4 border-b border-white/5 overflow-x-auto">
          {[
            { id: 'rdo', label: 'Diário de Obra', icon: Camera },
            { id: 'gantt', label: 'Cronograma', icon: Layers },
            { id: 'financeiro', label: 'Medições', icon: DollarSign },
            { id: 'documentos', label: 'Documentos', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as PortalTab)}
                className={`pb-3.5 transition-colors relative text-xs font-bold uppercase tracking-wider flex items-center gap-2 shrink-0 ${
                  isActive ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Active Stage Banner */}
        {etapaAtual && (
          <div className="mb-8 bg-gradient-to-r from-teal-950/40 via-slate-900/60 to-slate-900/40 border border-teal-500/20 rounded-3xl p-5 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
                <HardHat size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400">
                  Etapa em Execução Agora
                </span>
                <h3 className="text-base font-bold text-white leading-tight">
                  {etapaAtual.titulo}
                </h3>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-black font-mono text-teal-400">
                {etapaAtual.percentual_conclusao}%
              </span>
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider">
                Executado
              </span>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'rdo' && (
            <motion.div
              key="rdo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {diarios.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-white/10 rounded-3xl">
                  <Camera size={36} className="mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-400 text-sm font-medium">
                    Nenhum diário de obra publicado ainda.
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    Os relatos e fotos de campo postados pelo engenheiro aparecerão aqui.
                  </p>
                </div>
              ) : (
                diarios.map((diario: any) => {
                  const dateFormatted = diario.data_registro
                    ? format(new Date(diario.data_registro), "EEEE, d 'de' MMMM", { locale: ptBR })
                    : 'Data não informada';

                  return (
                    <div key={diario.id} className="relative pl-8">
                      {/* Timeline Line */}
                      <div className="absolute top-0 left-[11px] bottom-0 w-px bg-white/10" />

                      {/* Timeline Node */}
                      <div className="absolute top-1.5 left-0 w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/50 flex items-center justify-center shadow-lg shadow-teal-500/20">
                        <div className="w-2 h-2 rounded-full bg-teal-400" />
                      </div>

                      <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-colors shadow-sm">
                        <div className="p-5 border-b border-white/5 flex items-start justify-between">
                          <div>
                            <span className="block mb-0.5 text-xs font-semibold text-slate-400 capitalize">
                              {dateFormatted}
                            </span>
                            <h3 className="text-base font-bold text-white">{diario.titulo}</h3>
                          </div>
                          {diario.mao_de_obra_qtd !== undefined && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                              <HardHat size={13} className="text-teal-400" />
                              <span className="text-[10px] font-bold">
                                {diario.mao_de_obra_qtd} no local
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="p-5">
                          <p className="text-sm text-slate-300 leading-relaxed mb-6 whitespace-pre-line">
                            {diario.relatorio}
                          </p>

                          {/* Photos Grid */}
                          {diario.fotos && diario.fotos.length > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                              {diario.fotos.map((foto: string, idx: number) => (
                                <div
                                  key={idx}
                                  onClick={() =>
                                    handleOpenPhoto(
                                      diario.fotos,
                                      idx,
                                      diario.titulo,
                                      dateFormatted
                                    )
                                  }
                                  className="group relative aspect-video rounded-2xl overflow-hidden bg-black/50 border border-white/10 cursor-pointer shadow-md"
                                >
                                  <img
                                    src={foto}
                                    alt={`Foto da obra ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-medium text-xs">
                                    <Maximize2 size={16} />
                                    <span>Expandir</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === 'gantt' && (
            <motion.div
              key="gantt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-slate-900/30 border border-white/5 rounded-3xl p-6 mb-4">
                <h3 className="mb-1 text-sm font-bold text-white">Fases & Cronograma Executivo</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Acompanhe a evolução percentual de cada etapa da sua obra, desde a fundação até o acabamento final.
                </p>
              </div>

              {cronograma.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-white/10 rounded-3xl">
                  <Calendar size={36} className="mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-400 text-sm">Cronograma ainda não publicado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cronograma.map((etapa: any) => {
                    const isConcluido = etapa.percentual_conclusao === 100;
                    const isEmAndamento =
                      etapa.percentual_conclusao > 0 && etapa.percentual_conclusao < 100;

                    return (
                      <div
                        key={etapa.id}
                        className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-white/15 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {isConcluido ? (
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                              <CheckCircle2 size={20} />
                            </div>
                          ) : isEmAndamento ? (
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                              <Clock size={20} />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 text-slate-600 flex items-center justify-center shrink-0">
                              <Circle size={20} />
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-bold text-white mb-0.5">{etapa.titulo}</h4>
                            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                              <Calendar size={12} />
                              {etapa.data_inicio
                                ? format(new Date(etapa.data_inicio), 'dd/MM/yy')
                                : 'A definir'}{' '}
                              até{' '}
                              {etapa.data_fim
                                ? format(new Date(etapa.data_fim), 'dd/MM/yy')
                                : 'A definir'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-lg font-black font-mono text-white">
                            {etapa.percentual_conclusao}%
                          </span>
                          <div className="w-24 h-1.5 bg-black/50 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isConcluido
                                  ? 'bg-emerald-400'
                                  : isEmAndamento
                                  ? 'bg-amber-400'
                                  : 'bg-slate-700'
                              }`}
                              style={{ width: `${etapa.percentual_conclusao}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'financeiro' && (
            <PortalFinanceiroTab
              contratoValorTotal={Number(obra.valor_total || 0)}
              cronograma={cronograma}
              contasReceber={contasReceber}
            />
          )}

          {activeTab === 'documentos' && <PortalDocumentosTab arquivos={arquivos} />}
        </AnimatePresence>
      </main>

      {/* Floating WhatsApp Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={handleWhatsAppClick}
          className="flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider px-5 py-3.5 rounded-full shadow-2xl shadow-emerald-500/30 transition-transform hover:scale-105 active:scale-95"
        >
          <MessageCircle size={18} />
          <span>Falar com o Engenheiro</span>
        </button>
      </div>
    </div>
  );
}
